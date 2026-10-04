"""Record real CLI PTY output in asciicast v2 format (no scripted/fake results)."""
import json, os, pty, select, subprocess, time, struct, fcntl, termios, sys
from pathlib import Path
root=Path(__file__).resolve().parent.parent
started=time.monotonic()
skills_only='--skills' in sys.argv
recording=root/('docs/evidence/skills-terminal.cast' if skills_only else 'docs/evidence/terminal.cast')
plain=[]
node=os.environ.get('WORKBENCH_RECORD_NODE','node')
catalog=json.loads(subprocess.check_output([node,str(root/'packages/cli/dist/index.js'),'tools','list','--contract','saucerswap-testnet','--json'],cwd=root))['data']
factory=next(tool['id'] for tool in catalog if tool['signature']=='factory()')
commands=[['doctor'],['contracts','list'],['tools','list','--contract','saucerswap-testnet'],['tools','call',factory,'--args-file',str(root/'docs/examples/empty-arguments.json')]]
if skills_only: commands=[['skills','show','--contract','saucerswap-testnet'],['skills','install-command','--agent','codex','claude-code']]
with recording.open('w') as output:
    output.write(json.dumps({'version':2,'width':110,'height':30,'timestamp':int(time.time()),'title':'Contract Workbench actual CLI session','env':{'TERM':'xterm-256color'}})+'\n')
    for command in commands:
        caption='\r\n$ workbench '+' '.join(command)+'\r\n'
        output.write(json.dumps([time.monotonic()-started,'o',caption])+'\n');plain.append(caption)
        master,slave=pty.openpty()
        fcntl.ioctl(slave,termios.TIOCSWINSZ,struct.pack('HHHH',30,110,0,0))
        process=subprocess.Popen([node,str(root/'packages/cli/dist/index.js'),*command],cwd=root,stdin=slave,stdout=slave,stderr=slave,env={**{k:v for k,v in os.environ.items() if k!='NO_COLOR'},'TERM':'xterm-256color','FORCE_COLOR':'1'})
        os.close(slave)
        while True:
            readable,_,_=select.select([master],[],[],1)
            if readable:
                try: chunk=os.read(master,65536)
                except OSError: break
                if not chunk: break
                text=chunk.decode('utf-8',errors='replace');output.write(json.dumps([time.monotonic()-started,'o',text])+'\n');plain.append(text)
            elif process.poll() is not None: break
        os.close(master)
        if process.wait()!=0: raise RuntimeError('CLI recording command failed')
(root/('docs/evidence/skills-terminal.txt' if skills_only else 'docs/evidence/terminal.txt')).write_text(''.join(plain))
print(recording)
