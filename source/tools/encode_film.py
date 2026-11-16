import os, glob, shutil
from PIL import Image
src='/home/claude/film/frames2'; out='/home/claude/site2/img/film'; sm='/home/claude/site2/img/film-sm'
for d in (out, sm):
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
files=sorted(glob.glob(src+'/f*.png'))
for f in files:
    n=os.path.basename(f)[:-4]; im=Image.open(f).convert('RGB')
    im.save(f'{out}/{n}.jpg', quality=80, optimize=True, progressive=True)
    im.resize((960,540), Image.LANCZOS).save(f'{sm}/{n}.jpg', quality=78, optimize=True, progressive=True)
print(len(files),'frames')
stills={'still_structure':'structure','still_tech':'tech','still_data':'data','still_visibility':'visibility','still_fullstack':'fullstack','still_exploded':'exploded','still_scattered':'scattered'}
for k,v in stills.items():
    p=f'/home/claude/film/stills2/{k}.png'
    if not os.path.exists(p): print('missing',k); continue
    im=Image.open(p).convert('RGB')
    im.save(f'/home/claude/site2/img/i360_r_{v}.jpg', quality=84, optimize=True, progressive=True)
    im.resize((960,640), Image.LANCZOS).save(f'/home/claude/site2/img/i360_r_{v}-sm.jpg', quality=82, optimize=True, progressive=True)
    print('still',v)
