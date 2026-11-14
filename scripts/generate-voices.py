"""Generate only authored dialogue. Credentials are read at runtime, never stored.
Existing matching assets are reused; generation is explicit and not part of build.
"""
import hashlib,json,os,pathlib,subprocess,urllib.request,urllib.error,sys
root=pathlib.Path(__file__).resolve().parent.parent
items=json.loads(subprocess.check_output(['node','--import','tsx','scripts/export-audio.ts'],cwd=root))
out=root/'public'/'audio';out.mkdir(parents=True,exist_ok=True)
manifest_path=out/'manifest.json'
manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
pending=[]
for item in items:
    fingerprint=hashlib.sha256(json.dumps({'text':item['text'],'voice':item['voice'],'model':'eleven_multilingual_v2'},sort_keys=True).encode()).hexdigest()
    item['fingerprint']=fingerprint
    dest=out/item['file']
    saved=manifest.get(item['file'],{})
    if dest.exists() and saved.get('fingerprint')==fingerprint and saved.get('sha256')==hashlib.sha256(dest.read_bytes()).hexdigest():
        continue
    pending.append(item)
chars=sum(len(x['text']) for x in pending)
print(f'Pending clips: {len(pending)}, text characters: {chars}',flush=True)
if chars>8000: sys.exit('Batch exceeds 8000 characters; review scope before generation.')
if pending and not os.environ.get('ELEVENLABS_API_KEY'): sys.exit('ELEVENLABS_API_KEY is missing')
for item in pending:
    body=json.dumps({'text':item['text'],'model_id':'eleven_multilingual_v2','voice_settings':{'stability':0.6,'similarity_boost':0.75}}).encode()
    req=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/'+item['voice']+'?output_format=mp3_44100_128',data=body,headers={'xi-api-key':os.environ['ELEVENLABS_API_KEY'],'Content-Type':'application/json','Accept':'audio/mpeg'})
    try:
        with urllib.request.urlopen(req,timeout=90) as response:
            if 'audio' not in response.headers.get('Content-Type',''):sys.exit('Unexpected content type')
            data=response.read()
    except urllib.error.HTTPError as err:
        sys.exit(f'ElevenLabs HTTP {err.code}; generation stopped. Existing assets retained. No automatic paid retries.')
    if len(data)<1000:sys.exit('Audio output unexpectedly short')
    dest=out/item['file'];tmp=dest.with_suffix('.tmp');tmp.write_bytes(data);tmp.replace(dest)
    manifest[item['file']]={'provider':'ElevenLabs','model':'eleven_multilingual_v2','voice_id':item['voice'],'fingerprint':item['fingerprint'],'sha256':hashlib.sha256(data).hexdigest(),'characters':len(item['text'])}
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    print('Saved '+item['file'],flush=True)
