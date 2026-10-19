import { defineConfig } from 'vite';
import { transformAccountModule } from './scripts/account-layout-v414.mjs';

// Pure build transforms only; no source writes or retired runtime activation.
export default defineConfig({plugins:[{name:'ngeblogging-account-v414',enforce:'pre',transform:transformAccountModule}]});
