"""A one-line repair of completed Cataclysm 1.0 tuning source before independent QA.

The archived stage already fixed all combat, XP, scenery and speech systems.
The user noticed static hero animation: the finished code still prioritized
the eight-direction static aim atlas over the existing 24-frame run atlas.
Only idle/aim should use the directional full-body pose; moving should use the
existing original painted full-body run sheet. This avoids stitched legs.
"""
from pathlib import Path
old="['idle','run','walk','aim'].includes(state)"
new="['idle','aim'].includes(state)"
for root in ("cataclysm-1-0-major","cataclysm-100-lab"):
    path=Path("docs")/root/"animation.js"
    source=path.read_text()
    if old in source:
        assert source.count(old)==1,(root,"ambiguous old selector")
        path.write_text(source.replace(old,new,1))
    elif new not in source:
        raise SystemExit("Unexpected hero animation selector "+str(path))
    print("RUN-ANIMATION RECOVERED",path)
