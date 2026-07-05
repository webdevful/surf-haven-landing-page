// @ts-check
import { defineConfig } from 'astro/config';

// compressHTML stays OFF: the page relies on whitespace between inline
// accent <span>s; compression collapsed "of your <span>surfing skills"
// into "of yoursurfing skills" (First Article return, defect class 3).
export default defineConfig({
  compressHTML: false,
});
