"""Explicit paid generation of reviewed EN/BE scripts; never runs during build."""
import hashlib,json,os,pathlib,sys,urllib.request,urllib.error,argparse,subprocess
root=pathlib.Path(__file__).resolve().parent.parent
args=argparse.ArgumentParser();args.add_argument('--locale',choices=['en','be'],required=True);cfg=args.parse_args()
items=json.loads(subprocess.check_output(['node','--import','tsx','scripts/export-audio.ts'],cwd=root))
translations=json.loads((root/'src/i18n/overrides/audio.json').read_text())
model='eleven_v4_turbo';out=root/'public/audio'/cfg.locale;out.mkdir(parents=True,exist_ok=True)
manifest_path=out/'manifest.json';manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
pending=[]
for row in items:
    text=translations[row['file']][cfg.locale]
    fp=hashlib.sha256(json.dumps({'text':text,'voice':row['voice'],'model':model,'language':cfg.locale},sort_keys=True).encode()).hexdigest()
    dest=out/row['file'];saved=manifest.get(row['file'],{})
    if dest.exists() and saved.get('fingerprint')==fp and saved.get('sha256')==hashlib.sha256(dest.read_bytes()).hexdigest():continue
    pending.append((row,text,fp))
chars=sum(len(x[1]) for x in pending);print(f'{cfg.locale}: {len(pending)} clips; {chars} text characters',flush=True)
if chars>8000:sys.exit('Reviewed batch limit exceeded')
key=os.environ.get('ELEVENLABS_API_KEY')
if pending and not key:sys.exit('ELEVENLABS_API_KEY unavailable')
for i,(row,text,fp) in enumerate(pending):
    data=json.dumps({'text':text,'model_id':model,'language_code':cfg.locale,'voice_settings':{'stability':0.5,'similarity_boost':0.75}}).encode()
    request=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/'+row['voice']+'?output_format=mp3_44100_128',data=data,headers={'xi-api-key':key,'Content-Type':'application/json','Accept':'audio/mpeg'})
    try:
        with urllib.request.urlopen(request,timeout=90) as response:
            if 'audio' not in response.headers.get('Content-Type',''):sys.exit('Unexpected response type; no paid retry')
            audio=response.read()
    except urllib.error.HTTPError as e:sys.exit(f'ElevenLabs HTTP {e.code}; stopped without automatic paid retry')
    if len(audio)<1000:sys.exit('Audio too short; stopped without paid retry')
    dest=out/row['file'];temp=dest.with_suffix('.tmp');temp.write_bytes(audio);temp.replace(dest)
    manifest[row['file']]={'provider':'ElevenLabs','model':model,'language':cfg.locale,'voice_id':row['voice'],'fingerprint':fp,'sha256':hashlib.sha256(audio).hexdigest(),'characters':len(text)}
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    if (i+1)%4==0 or i+1==len(pending):print(f'{cfg.locale}: saved {i+1}/{len(pending)}',flush=True)
