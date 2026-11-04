"""Automated gameplay review; store outputs in private Google Drive, never GitHub artifacts."""
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

def drive_upload(token, path, folder_id, name, mime):
    # Resumable upload; streams large files without loading them into RAM.
    meta={"name":name,"parents":[folder_id],"mimeType":mime}
    r=session.post("https://www.googleapis.com/upload/drive/v3/files",
        params={"uploadType":"resumable","fields":"id,name,webViewLink"},
        headers={"Authorization":"Bearer "+token,"X-Upload-Content-Type":mime,
                 "X-Upload-Content-Length":str(path.stat().st_size),
                 "Content-Type":"application/json"},
        json=meta,timeout=60)
    r.raise_for_status()
    url=r.headers["Location"]
    size=path.stat().st_size
    with path.open("rb") as f:
        offset=0
        while offset<size:
            data=f.read(min(8*1024*1024,size-offset))
            end=offset+len(data)-1
            response=session.put(url,data=data,headers={
                "Content-Length":str(len(data)),
                "Content-Range":f"bytes {offset}-{end}/{size}"},timeout=180)
            if response.status_code not in (200,201,308):
                response.raise_for_status()
            offset=end+1
    response.raise_for_status()
    return response.json()

def delivery_folder(token):
    name="Cataclysm YouTube Ready"
    q="name = '"+name+"' and '"+FOLDER+"' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    files=drive_api("files",token,{"q":q,"fields":"files(id,name)"}).json()["files"]
    if files: return files[0]["id"]
    r=session.post("https://www.googleapis.com/drive/v3/files",
        headers={"Authorization":"Bearer "+token},json={
            "name":name,"mimeType":"application/vnd.google-apps.folder",
            "parents":[FOLDER]},timeout=60)
    r.raise_for_status()
    return r.json()["id"]

def newest_video(token):
    query = "'" + FOLDER + "' in parents and mimeType contains 'video/' and trashed = false"
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

def analyse_frames(path, seconds):
    # Sample evenly throughout the recording, capped to 24 images.
    count=min(24,max(4,int(seconds//40)+1))
    items=[]
    for i in range(count):
        t=seconds*(i+0.5)/count
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

def create_report(transcript, frames, seconds):
    prompt=("You are BoRHeZ Games QA lead. This is Cataclysm 0.2 gameplay. "
      "Produce a concise markdown report with: evidence/observations (timestamps where available), "
      "issues and severity, reproducible tests, recommended Cataclysm 0.3 backlog, "
      "and a suggested 45-120 second gameplay highlight edit as JSON on the last line "
      "with exact syntax EDIT_SEGMENTS=[{\"start\":0,\"end\":20}] and 2-5 segments. "
      "Keep segments inside the recording duration and do not claim to know unobserved events. "
      "Use spoken transcript and sampled visual frames as different evidence sources. "
      "No automatic code merge or publishing.\nDuration: "+str(seconds)+
      "\nTranscript: "+json.dumps(transcript,ensure_ascii=False)[:40000]+
      "\nVisual observations: "+frames)
    result=client.chat.completions.create(model="gpt-4.1-mini",
        messages=[{"role":"user","content":prompt}],max_tokens=2400)
    return result.choices[0].message.content

def highlight(video, report, seconds):
    import re
    # Recover a fenced or multiline EDIT_SEGMENTS array; never silently output an
    # unrelated first-minute clip. AI suggestions are checked against duration.
    match=re.search(r"EDIT_SEGMENTS\\s*=\\s*(\\[.*?\\])",report,re.S)
    segments=[]
    if match:
        raw=re.sub(r"//[^\\n]*","",match.group(1))
        raw=re.sub(r",\\s*([}\\]])",r"\\1",raw)
        try:
            for item in json.loads(raw):
                a=max(0,float(item["start"]))
                b=min(seconds,float(item["end"]))
                if b>a and b-a<=90: segments.append((a,b))
        except (ValueError,KeyError,TypeError):
            pass
    if not segments:
        raise ValueError("AI edit decision invalid; refusing to deliver a misleading fallback video")
    segments=segments[:5]
    total=sum(b-a for a,b in segments)
    if total<30 or total>180:
        raise ValueError(f"Highlight duration {total:.0f}s outside quality gate (30-180s)")
    paths=[]
    for i,(a,b) in enumerate(segments):
        target=OUT/("cut_%02d.mp4"%i)
        subprocess.run(["ffmpeg","-y","-v","error","-ss",str(a),"-t",str(b-a),
            "-i",str(video),"-vf","scale='min(1280,iw)':-2",
            "-c:v","libx264","-preset","veryfast","-crf","23",
            "-c:a","aac","-b:a","128k","-movflags","+faststart",str(target)],check=True)
        paths.append(target)
    manifest=OUT/"cuts.txt"
    manifest.write_text("".join("file '"+p.name+"'\\n" for p in paths))
    output=OUT/"cataclysm_highlights.mp4"
    subprocess.run(["ffmpeg","-y","-v","error","-f","concat","-safe","0",
        "-i",str(manifest),"-c","copy","-movflags","+faststart",str(output)],check=True)
    if not 29<=duration(output)<=181 or output.stat().st_size<1000000:
        raise ValueError("Edited video failed duration/size quality gate")
    for f in paths: f.unlink()
    manifest.unlink()
    return segments


def github_issue(title,body):
    r=session.post("https://api.github.com/repos/"+GH+"/issues",
      headers={"Authorization":"Bearer "+os.environ["GH_TOKEN"],
               "Accept":"application/vnd.github+json"},
      json={"title":title,"body":body},timeout=30)
    r.raise_for_status()
    print("Created review issue:",r.json()["html_url"])

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
    # Scheduled runs avoid repeat paid analysis by checking an existing issue title.
    title="Gameplay review: "+metadata["name"]+" ["+file_id+"]"
    check=session.get("https://api.github.com/repos/"+GH+"/issues",
       headers={"Authorization":"Bearer "+os.environ["GH_TOKEN"]},
       params={"state":"all","per_page":100},timeout=30)
    check.raise_for_status()
    if not os.getenv("REPROCESS_EXISTING") == "true" and any(x.get("title")==title for x in check.json()):
        print("Already reviewed; skipping duplicate processing.");return
    video=OUT/"raw.mp4"
    download(token,file_id,video)
    seconds=duration(video)
    if seconds > 3600: sys.exit("Recording exceeds 60-minute processing cost cap")
    transcript=transcribe(video,seconds)
    (OUT/"transcript.json").write_text(json.dumps(transcript,indent=2,ensure_ascii=False))
    frames=analyse_frames(video,seconds)
    (OUT/"visual_review.md").write_text(frames)
    report=create_report(transcript,frames,seconds)
    (OUT/"development_report.md").write_text(report)
    segments=highlight(video,report,seconds)
    folder=delivery_folder(token)
    for name,mime in [("cataclysm_highlights.mp4","video/mp4"),
                      ("development_report.md","text/markdown"),
                      ("transcript.json","application/json"),
                      ("visual_review.md","text/markdown")]:
        f=OUT/name
        drive_upload(token,f,folder,metadata["name"].rsplit(".",1)[0]+"_"+name,mime)
    video.unlink()
    link="https://drive.google.com/drive/folders/"+folder
    if os.getenv("REPROCESS_EXISTING") != "true":
        github_issue(title,"Automated gameplay review. Original Drive file ID: "+file_id+
           "\\n\\n"+report[:55000]+
           "\\n\\nEdited video and review files (private Drive): "+link+
           "\\nSelected segments: "+json.dumps(segments)+
           "\\nHuman approval required before YouTube publication.")
    print("Private Google Drive delivery:",link)
if __name__=="__main__":
    main()
