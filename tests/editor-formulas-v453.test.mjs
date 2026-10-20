import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateTableFormula,formulaReference} from '../src/lib/editor-formulas-v453.mjs';
import {transformEditorFormulas} from '../scripts/editor-formulas-v453.mjs';
const matrix=[[10,20,'text'],[30,null,null]],read=(r,c)=>matrix[r]?.[c]??null;
for(const [formula,expected] of [['=SUM(A1:B2)',60],['=AVERAGE(A1:B2)',20],['=MIN(A1:B2)',10],['=MAX(A1:B2)',30],['=COUNT(A1:C2)',3],['=COUNTA(A1:C2)',4],['=PRODUCT(A1:B1)',200],['=ABS(-5)',5],['=ROUND(12.345,2)',12.35]])test(formula,()=>assert.equal(evaluateTableFormula(formula,read),expected));
test('bounds and unsupported expressions fail closed',()=>{assert.deepEqual(formulaReference('AX50'),[49,49]);assert.throws(()=>formulaReference('AY1'));assert.throws(()=>evaluateTableFormula('=SUM(alert(1))',read),/FORMULA_UNSUPPORTED/);assert.throws(()=>evaluateTableFormula('=FETCH(A1)',read),/FORMULA_UNSUPPORTED/);assert.throws(()=>evaluateTableFormula('=AVERAGE(B2)',read),/FORMULA_DIV_ZERO/);});
test('public metadata and table structural guard are connected',()=>{for(const [file,marker] of [['src/lib/public-typography-v444.mjs','FORMULA_ATTRIBUTE_V453'],['src/EditorTableToolsV450.jsx','FORMULA_STRUCTURE_GUARD_V453'],['src/ContentEditor.jsx','import EditorFormulaToolsV453']]){const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');const result=transformEditorFormulas(source,'/repo/'+file);assert.ok(result.code.includes(marker));assert.equal(transformEditorFormulas(result.code,'/repo/'+file),null);}});
