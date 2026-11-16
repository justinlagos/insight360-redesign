import cv2, numpy as np, json, sys
from PIL import Image, ImageFilter
R='/home/claude/photo3/raw/'; O='/home/claude/photo3/out/'
def load(n): return cv2.imread(R+n+'.png')
def inpaint(img, rects, r=4):
    m=np.zeros(img.shape[:2],np.uint8)
    for x0,y0,x1,y1 in rects: m[y0:y1,x0:x1]=255
    return cv2.inpaint(img,m,r,cv2.INPAINT_TELEA)
def blank_notes(img, box):
    # remove handwriting on sticky notes: strokes are darker than the note around them
    x0,y0,x1,y1=box; sub=img[y0:y1,x0:x1]
    hsv=cv2.cvtColor(sub,cv2.COLOR_BGR2HSV)
    note=((hsv[...,1]>60)&(hsv[...,2]>90)).astype(np.uint8)*255
    note=cv2.morphologyEx(note,cv2.MORPH_CLOSE,np.ones((17,17),np.uint8))
    note=cv2.erode(note,np.ones((7,7),np.uint8))
    v=hsv[...,2].astype(np.int16); bg=cv2.medianBlur(hsv[...,2],31).astype(np.int16)
    text=((bg-v)>18).astype(np.uint8)*255
    text=cv2.bitwise_and(text,note); text=cv2.dilate(text,np.ones((5,5),np.uint8))
    m=np.zeros(img.shape[:2],np.uint8); m[y0:y1,x0:x1]=text
    return cv2.inpaint(img,m,6,cv2.INPAINT_TELEA)
fixes={
 'audit':lambda i: inpaint(i,[(749,674,801,711)]),
 'boardroom':lambda i: inpaint(i,[(808,507,830,530),(647,667,685,707),(990,284,1028,298)]),
 'case-kunochdigi':lambda i: inpaint(i,[(455,559,506,583),(710,637,748,669)],5),
 'case-ionec':lambda i:i, 'case-kunochfoods':lambda i:i, 'test_gemini':lambda i:i,
 'test_sunburst':lambda i: blank_notes(i,(420,70,860,400)),
}
rng=np.random.default_rng(7)
def finish(pil, size):
    W,H=size; w,h=pil.size; s=max(W/w,H/h)
    pil=pil.resize((round(w*s),round(h*s)),Image.LANCZOS)
    return pil
def crop_to(pil, aspect, fx=0.5, fy=0.5):
    w,h=pil.size
    if w/h>aspect: nw=round(h*aspect); x=round((w-nw)*fx); return pil.crop((x,0,x+nw,h))
    nh=round(w/aspect); y=round((h-nh)*fy); return pil.crop((0,y,w,y+nh))
def grade(pil):
    a=np.asarray(pil).astype(np.float32)/255
    a=np.clip(a,0,1); a=a*0.985+0.006            # tiny black lift, no clipped whites
    a=a+(a-a.mean(axis=2,keepdims=True))*(-0.04)  # pull saturation back 4%
    g=rng.normal(0,0.010,a.shape[:2])[...,None]   # mono grain
    a=np.clip(a+g,0,1)
    return Image.fromarray((a*255+0.5).astype(np.uint8))
def out(src, slot, aspect, size, sm, fx=0.5, fy=0.5):
    img=fixes[src](load(src)); pil=Image.fromarray(cv2.cvtColor(img,cv2.COLOR_BGR2RGB))
    pil=crop_to(pil,aspect,fx,fy); big=pil.resize(size,Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2,40,2))
    big=grade(big); big.save(O+f'i360_{slot}.jpg',quality=86,optimize=True,progressive=True)
    big.resize(sm,Image.LANCZOS).save(O+f'i360_{slot}-sm.jpg',quality=84,optimize=True,progressive=True)
L=(1536,1024); Ls=(960,640); W=(1536,864); Ws=(960,540); P=(1024,1536); Ps=(720,1080)
plan=[ # final slots done now
 ('audit','audit',3/2,L,Ls,.5,.5),
 ('boardroom','boardroom',16/9,W,Ws,.5,.5),
 ('case-ionec','case-ionec',3/2,L,Ls,.5,.5),
 ('case-kunochdigi','case-kunochdigi',3/2,L,Ls,.5,.5),
 ('case-kunochfoods','case-kunochfoods',3/2,L,Ls,.5,.5),
 ('test_gemini','training',3/2,L,Ls,.5,.5),
 ('test_sunburst','workshop',3/2,L,Ls,.5,.5),
 # interim fills until the remaining six are generated
 ('audit','glasswall',16/9,W,Ws,.5,.55),
 ('test_gemini','understand',16/9,W,Ws,.5,.6),
 ('test_sunburst','screen',2/3,P,Ps,.47,.5),
 ('case-kunochfoods','ops',3/2,L,Ls,.5,.5),
 ('boardroom','report',3/2,L,Ls,.62,.5),
 ('case-kunochdigi','roadmap',3/2,L,Ls,.5,.5),
]
for p in plan: out(*p); print('ok',p[1])
og=Image.open(O+'i360_boardroom.jpg'); crop_to(og,1200/630).resize((1200,630),Image.LANCZOS).save(O+'i360_og.jpg',quality=85)
