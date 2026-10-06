const [major,minor]=process.versions.node.split('.').map(Number);
if(major!==24||minor<15){console.error('Command Center requires Node 24.15+ (24 LTS). Run fnm use in this directory or source ../env.sh.');process.exit(1);}
