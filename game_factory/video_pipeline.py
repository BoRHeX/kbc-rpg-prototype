"""Automated gameplay review. OAuth is read-only; never exposes video publicly."""
import base64, datetime, hashlib, json, os, pathlib, subprocess, sys, time
import requests
from openai import OpenAI

OUT = pathlib.Path("artifacts/video_review")
OUT.mkdir(parents=True, exist_ok=True)
FOLDER = os.environ["GOOGLE_DRIVE_FOLDER_ID"]
GH = os.environ["GH_REPO"]
client = OpenAI()
session = requests.Session()

def cmd(*args):
    return subprocess.check_output(args, text=True).strip()

def refresh_token():
    r = session.post("https://oauth2.googleapis.com/token", data={
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
        "refresh_token": os.environ["GOOGLE_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]

def drive_api(path, token, params=None, stream=False):
    r = session.get("https://www.googleapis.com/drive/v3/" + path,
        headers={"Authorization": "Bearer " + token}, params=params,
        timeout=(30, 180), stream=stream)
    r.raise_for_status()
    return r

def newest_video(token):
    query = "'" + FOLDER + "' in parents and mimeType contains 'video/' and name contains 'cataclysm__' and trashed = false"
    data = drive_api("files", token, {"q":query, "fields":"files(id,name,modifiedTime),nextPageToken",
                                    "orderBy":"modifiedTime desc","pageSize":10}).json()
    return data["files"][0] if data["files"] else None

def download(token, file_id, target):
    with drive_api("files/" + file_id, token, {"alt":"media"}, stream=True) as r:
        with target.open("wb") as f:
            for block in r.iter_content(1024*1024):
                if block: f.write(block)

def duration(path):
    return float(cmd("ffprobe","-v","error","-show_entries","format=duration",
                     "-of","default=noprint_wrappers=1:nokey=1",str(path)))

def transcribe(path, seconds):
    # Extract bounded 8-minute MP3 chunks; audio API file size stays small.
    chunks=[]
    for start in range(0,int(seconds)+1,480):
        part=OUT / ("audio_%04d.mp3"%start)
        subprocess.run(["ffmpeg","-y","-v","error","-ss",str(start),"-t","480",
                        "-i",str(path),"-vn","-ac","1","-ar","16000",
                        "-b:a","32k",str(part)],check=True)
        if part.stat().st_size < 2000: continue
        with part.open("rb") as f:
            response=client.audio.transcriptions.create(model="whisper-1",file=f,
                response_format="verbose_json")
        chunks.append({"start_seconds":start,"text":response.text,
                       "segments":[{"start":start+s.start,"end":start+s.end,
                                    "text":s.text} for s in (response.segments or [])]})
        part.unlink()
    return chunks

def analyse_frames(path, seconds, transcript=None):
    # Transcript is examined FIRST. Sample a maximum of 36 actual frames:
    # half temporal coverage, half speech-anchored moments. Never infer motion
    # between individual samples.
    count=min(36,max(12,int(seconds//100)+1))
    coverage=[seconds*(i+0.5)/(count//2) for i in range(count//2)]
    keywords=("zombie","horde","spawn","wave","cat","tail","draw","animation",
              "move","control","lag","bug","screen","follower","companion",
              "upgrade","fish","boss","weapon","music","sound","ui","night",
              "problem","need","should","look","see","better","wrong")
    candidates=[]
    for chunk in transcript or []:
        for seg in chunk.get("segments",[]):
            words=seg.get("text","").lower()
            score=sum(1 for k in keywords if k in words)
            if score:
                candidates.append((score, (float(seg["start"])+float(seg["end"]))/2))
    candidates.sort(key=lambda pair: (-pair[0],pair[1]))
    selected=list(coverage)
    for _,t in candidates:
        if len(selected)>=count: break
        if t>2 and t<seconds-2 and all(abs(t-s)>10 for s in selected):
            selected.append(t)
    targets=sorted(selected)[:count]
    items=[]
    for i,t in enumerate(targets):
        image_path=OUT/("frame_%02d.jpg"%i)
        subprocess.run(["ffmpeg","-y","-v","error","-ss",str(t),"-i",str(path),
                        "-frames:v","1","-vf","scale=640:-2","-q:v","5",
                        str(image_path)],check=True)
        data=base64.b64encode(image_path.read_bytes()).decode()
        items.extend([{"type":"text","text":"Frame timestamp %.1f seconds"%t},
                      {"type":"image_url","image_url":{"url":"data:image/jpeg;base64,"+data,"detail":"low"}}])
        image_path.unlink()
    result=client.chat.completions.create(model="gpt-4.1-mini",
        messages=[{"role":"system","content":"You are a critical game QA reviewer. Describe only visible evidence. Distinguish uncertainty. Assess HUD, mobile usability, enemy movement, feedback, visual clarity, bugs. Timestamp observations. Do not invent events between frames."},
                  {"role":"user","content":items}],max_tokens=1600)
    return result.choices[0].message.content

def create_report(transcript, frames, seconds, recording_name):
    prompt=("You are BoRHeZ Games QA lead reviewing a mobile game recording. "
      "Recording name: "+recording_name+". "
      "Produce a concise markdown report with: evidence/observations (timestamps where available), "
      "issues and severity, reproducible tests, prioritized game-specific improvement backlog, "
      "and a suggested 45-120 second gameplay highlight edit as JSON on the last line "
      "with exact syntax EDIT_SEGMENTS=[{\"start\":0,\"end\":20}] and 2-5 segments. "
      "Include up to six SHORT verbatim GAMEPLAY quotes with timecodes only when provably present in provided transcript; no private/personal remarks. " "Keep segments inside the recording duration and do not claim to know unobserved events. "
      "Use spoken transcript and sampled visual frames as different evidence sources. "
      "No automatic code merge or publishing.\nDuration: "+str(seconds)+
      "\nTranscript: "+json.dumps(transcript,ensure_ascii=False)[:120000]+
      "\nVisual observations: "+frames)
    result=client.chat.completions.create(model="gpt-4.1-mini",
        messages=[{"role":"user","content":prompt}],max_tokens=2400)
    return result.choices[0].message.content

def highlight(video, report, seconds):
    import re
    match=re.search(r"EDIT_SEGMENTS=(\[[^\n]+\])",report)
    segments=[]
    if match:
        try:
            for item in json.loads(match.group(1)):
                a=max(0,float(item["start"])); b=min(seconds,float(item["end"]))
                if b>a and b-a<=90: segments.append((a,b))
        except (ValueError,KeyError,TypeError): pass
    if not segments:
        segments=[(0,min(60,seconds))]
    # Re-encode each segment, concat via demuxer; audio optional.
    paths=[]
    for i,(a,b) in enumerate(segments[:5]):
        target=OUT/("cut_%02d.mp4"%i)
        subprocess.run(["ffmpeg","-y","-v","error","-ss",str(a),"-t",str(b-a),
            "-i",str(video),"-vf","scale='min(1280,iw)':-2",
            "-c:v","libx264","-preset","veryfast","-crf","28",
            "-c:a","aac","-b:a","96k","-movflags","+faststart",str(target)],check=True)
        paths.append(target)
    manifest=OUT/"cuts.txt"
    manifest.write_text("".join("file '"+p.name+"'\n" for p in paths))
    subprocess.run(["ffmpeg","-y","-v","error","-f","concat","-safe","0",
        "-i",str(manifest),"-c","copy",str(OUT/"gameplay_highlights.mp4")],check=True)
    for p in paths: p.unlink()
    manifest.unlink()

def github_issue(title,body):
    r=session.post("https://api.github.com/repos/"+GH+"/issues",
      headers={"Authorization":"Bearer "+os.environ["GH_TOKEN"],
               "Accept":"application/vnd.github+json"},
      json={"title":title,"body":body},timeout=30)
    r.raise_for_status()
    print("Created review issue:",r.json()["html_url"])

def already_processed(file_id):
    """Avoid repeated API charges for queued, accepted or deliberately skipped videos."""
    key = "yt-" + hashlib.sha256(file_id.encode("utf-8")).hexdigest()[:24]
    if (pathlib.Path("game_factory/results") / (key + ".json")).exists():
        return True
    if (pathlib.Path("game_factory/review_markers") / (key + ".json")).exists():
        return True
    current = pathlib.Path("game_factory/requests/current.json")
    if current.exists():
        try:
            if json.loads(current.read_text(encoding="utf-8")).get("id") == key:
                return True
        except (ValueError, OSError):
            pass
    return False


def main():
    missing=[k for k in ("GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","GOOGLE_REFRESH_TOKEN",
                        "OPENAI_API_KEY") if not os.getenv(k)]
    if missing: sys.exit("Missing GitHub Actions secrets: "+", ".join(missing))
    token=refresh_token()
    specified=os.getenv("DRIVE_FILE_ID","").strip()
    item={"id":specified,"name":"Cataclysm gameplay"} if specified else newest_video(token)
    if not item:
        print("No gameplay recordings found.");return
    file_id=item["id"]
    metadata=drive_api("files/"+file_id,token,{"fields":"id,name,mimeType,parents,size"}).json()
    if metadata.get("mimeType","").split("/")[0]!="video" or FOLDER not in metadata.get("parents",[]):
        sys.exit("Refusing to process: file is not a video in the authorized YouTube folder")
    # Check durable requests/receipts/markers before initiating paid inference.
    if already_processed(file_id):
        print("Recording already processed or queued. No repeat API calls."); return
    # Retain backwards compatibility for old reviews recorded as GitHub issues.
    title="Gameplay review: "+metadata["name"]+" ["+file_id+"]"
    check=session.get("https://api.github.com/repos/"+GH+"/issues",
       headers={"Authorization":"Bearer "+os.environ["GH_TOKEN"]},
       params={"state":"all","per_page":100},timeout=30)
    check.raise_for_status()
    if any(x.get("title")==title for x in check.json()):
        print("Already reviewed; skipping duplicate processing.");return
    (OUT/"recording.json").write_text(json.dumps(metadata,indent=2,ensure_ascii=False)+"\n")
    video=OUT/"raw.mp4"
    download(token,file_id,video)
    seconds=duration(video)
    transcript=transcribe(video,seconds)
    (OUT/"transcript.json").write_text(json.dumps(transcript,indent=2,ensure_ascii=False))
    frames=analyse_frames(video,seconds,transcript)
    (OUT/"visual_review.md").write_text(frames)
    report=create_report(transcript,frames,seconds,metadata["name"])
    (OUT/"development_report.md").write_text(report)
    # The Studio needs transcripts and sampled visual frames, not a YouTube highlight.
    # Keep the source recording in private Drive; generate no derived public video.
    video.unlink()
    # This public repository must not receive private commentary or a raw transcript.
    print("Gameplay QA complete; handing ephemeral transcript/report to Studio bridge.")

if __name__=="__main__":
    main()
