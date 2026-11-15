"""Prepare static educational-language catalogs. Never used by the app at runtime.
Only source-code strings are sent. User messages, images and saved progress are not read.
"""
import argparse,hashlib,json,pathlib,re,time,urllib.parse,urllib.request,urllib.error
root=pathlib.Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--locale',choices=['en','be'],required=True);parser.add_argument('--dry-run',action='store_true');args=parser.parse_args()
source=json.loads((root/'src/i18n/catalogs/ru.json').read_text())
path=root/f'src/i18n/catalogs/{args.locale}.json';target=json.loads(path.read_text()) if path.exists() else {'messages':{},'templates':{}}
overrides_path=root/f'src/i18n/overrides/{args.locale}.json';overrides=json.loads(overrides_path.read_text()) if overrides_path.exists() else {'messages':{},'templates':{}}
audio=json.loads((root/'src/i18n/overrides/audio.json').read_text())
overrides['messages'].update({row['ru']:row[args.locale] for row in audio.values()})
for kind in ['messages','templates']:target[kind].update(overrides.get(kind,{}))
pending=[(kind,k) for kind,values in source.items() for k in values if not target[kind].get(k)]
print(f'{args.locale}: {len(pending)} pending strings; {sum(len(k) for _,k in pending)} source characters',flush=True)
if args.dry_run:raise SystemExit(0)
def write():
 for kind in ['messages','templates']:target[kind]={k:target[kind][k] for k in source[kind] if k in target[kind]}
 tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(target,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)
def placeholders(s):return sorted(re.findall(r'\{\d+\}',s))
def process(group):
 content='\n\n'.join(f'ZXQ{i:05d}ZXQ\n'+key for i,(_,key) in enumerate(group))
 query=urllib.parse.urlencode({'client':'gtx','sl':'ru','tl':args.locale,'dt':'t','q':content})
 req=urllib.request.Request('https://translate.googleapis.com/translate_a/single?'+query,headers={'User-Agent':'CyberShield static-localization/1.0'})
 with urllib.request.urlopen(req,timeout=35) as response:result=json.load(response)
 translated=''.join(part[0] or '' for part in result[0])
 tokens=list(re.finditer(r'ZXQ\s*(\d{5})\s*ZXQ',translated,re.I))
 if len(tokens)!=len(group) or [int(x.group(1)) for x in tokens]!=list(range(len(group))):raise ValueError('Translation markers did not survive; no partial batch accepted')
 out=[]
 for i,(kind,key) in enumerate(group):
  text=translated[tokens[i].end():tokens[i+1].start() if i+1<len(tokens) else len(translated)].strip()
  if not text or placeholders(text)!=placeholders(key):raise ValueError('Empty translation or changed placeholders; no batch accepted')
  out.append((kind,key,text))
 return out
groups=[];group=[];size=0
for row in pending:
 cost=len(urllib.parse.quote(row[1]))+45
 if group and size+cost>6500:groups.append(group);group=[];size=0
 group.append(row);size+=cost
if group:groups.append(group)
for i,group in enumerate(groups):
 try:out=process(group)
 except urllib.error.HTTPError as e:raise SystemExit(f'Translation provider HTTP {e.code}; existing catalog retained')
 except urllib.error.URLError:raise SystemExit('Translation provider is blocked or unavailable; existing catalog retained')
 except (ValueError,KeyError,TypeError,json.JSONDecodeError) as e:raise SystemExit(str(e))
 for kind,key,value in out:target[kind][key]=value
 write()
 if (i+1)%10==0 or i+1==len(groups):print(f'{args.locale}: saved batch {i+1}/{len(groups)}',flush=True)
 time.sleep(.2)
write()
manifest=json.loads((root/'src/i18n/catalogs/manifest.json').read_text())
if all(target[kind].get(key) for kind in ['messages','templates'] for key in source[kind]):
 target['sourceHash']=manifest['sourceHash'];write()
