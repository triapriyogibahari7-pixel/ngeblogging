import {readFile,writeFile} from 'node:fs/promises';import {buildPlan} from '../lib/plan.mjs';
const plan=buildPlan(JSON.parse(await readFile(process.argv[2]||'config/domain.example.json','utf8')));await writeFile(process.argv[3]||'proposed-dns-plan.json',JSON.stringify(plan,null,2));console.log(JSON.stringify({deployable:plan.deployable,blockers:plan.blockers},null,2));
