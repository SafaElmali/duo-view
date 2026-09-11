from pathlib import Path
import numpy as np
import wave
SR=48000
DURATION=28
sound=np.zeros((SR*DURATION,2),dtype=np.float64)
rng=np.random.default_rng(24)
def note(midi):return 440*2**((midi-69)/12)
def add(start,signal,gain=1,pan=0):
 i=int(start*SR);n=min(len(signal),len(sound)-i)
 if n<=0:return
 sound[i:i+n,0]+=signal[:n]*gain*np.sqrt((1-pan)/2)
 sound[i:i+n,1]+=signal[:n]*gain*np.sqrt((1+pan)/2)
chords=[[50,57,62,65],[46,53,58,62],[53,60,65,69],[48,55,60,64]]
# Warm, original sustained chords, a quiet bass pulse, and a glassy arpeggio.
for bar,start in enumerate(np.arange(0,DURATION,2)):
 chord=chords[bar%4]
 t=np.arange(int(2.6*SR))/SR
 envelope=np.minimum(t/.32,1)*np.minimum((2.6-t)/.85,1)
 pad=sum(np.sin(2*np.pi*note(n)*t+.003*np.sin(2*np.pi*.3*t))+.2*np.sin(2*np.pi*note(n)*2*t) for n in chord)/len(chord)
 add(start,pad*envelope,.14,(-1)**bar*.23)
 for k in range(4):
  t2=np.arange(int(.8*SR))/SR
  tone=note(chord[[0,2,1,3][k]]+12)
  pluck=(np.sin(2*np.pi*tone*t2)+.26*np.sin(2*np.pi*tone*2*t2))*np.exp(-t2*6)*np.minimum(t2/.009,1)
  add(start+k*.5,pluck,.13,[-.45,.25,-.1,.5][k])
  add(start+k*.5+.1875,pluck,.032,-[-.45,.25,-.1,.5][k])
for beat,start in enumerate(np.arange(0,DURATION,.5)):
 t=np.arange(int(.35*SR))/SR
 kick=np.sin(2*np.pi*(48*t+20*(1-np.exp(-t*22))/22))*np.exp(-t*15)*np.minimum(t/.003,1)
 add(start,kick,.28)
 t=np.arange(int(.055*SR))/SR
 noise=rng.normal(0,1,len(t));noise=np.concatenate(([0],np.diff(noise)))
 add(start+.25,noise*np.exp(-t*95)*np.minimum(t/.002,1),.012,(-1)**beat*.35)
 if beat%2:
  t=np.arange(int(.12*SR))/SR
  clap=rng.normal(0,1,len(t))*np.exp(-t*45)*np.minimum(t/.002,1)
  add(start,clap,.027)
for start in [4,10,16,22]:
 t=np.arange(int(.6*SR))/SR
 whoosh=rng.normal(0,1,len(t));whoosh=np.convolve(whoosh,np.ones(30)/30,mode='same')
 add(start-.35,whoosh*np.sin(np.pi*t/.6)**2,.09)
fade=np.minimum(np.arange(len(sound))/SR/1.2,1)*np.minimum((len(sound)-np.arange(len(sound)))/SR/1.6,1)
sound*=fade[:,None]
sound=np.tanh(sound*1.35)
sound*=.82/max(np.max(np.abs(sound)),.82)
with wave.open(str(Path(__file__).parent.parent/'public/duo-score.wav'),'wb') as out:
 out.setnchannels(2);out.setsampwidth(2);out.setframerate(SR);out.writeframes((sound*32767).astype('<i2').tobytes())
print('Original 28-second score ready.')
