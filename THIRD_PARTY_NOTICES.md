# Third-party notices

Pixel Lens is released under the MIT license (see [LICENSE](LICENSE)). It uses the open-source packages below, each under its own license.

## Shipped with Pixel Lens

These components end up inside a built artifact (the extension package, the website or the `@pixel-lens/mcp` package).

| Component | Where | License |
| --- | --- | --- |
| React, React DOM, scheduler | extension, website | MIT, Copyright (c) Meta Platforms, Inc. and affiliates |
| WXT runtime helpers | extension | MIT, Copyright (c) Aaron Klinker |
| Inter (via @fontsource-variable/inter) | website | SIL Open Font License 1.1, Copyright (c) The Inter Project Authors |
| JetBrains Mono (via @fontsource-variable/jetbrains-mono) | website | SIL Open Font License 1.1, Copyright (c) The JetBrains Mono Project Authors |
| Model Context Protocol TypeScript SDK | mcp | MIT, Copyright (c) Anthropic, PBC |
| ws | mcp | MIT, Copyright (c) Einar Otto Stangvik and contributors |
| zod | mcp | MIT, Copyright (c) Colin McDonnell |

The fonts are used unmodified. The full text of the SIL Open Font License 1.1 is at https://openfontlicense.org.

Packages such as `sharp`, `@img/sharp-libvips-*` (LGPL-3.0-or-later) and `lightningcss` (MPL-2.0) are build tools for the website. They run on the build machine and are not distributed in any artifact.

## All production dependencies

Generated with `pnpm licenses list --prod -r`. Regenerate it when dependencies change.

| Package | Version | License |
| --- | --- | --- |
| @astrojs/compiler-binding | 0.5.2 | MIT |
| @astrojs/compiler-binding-darwin-arm64 | 0.5.2 | MIT |
| @astrojs/compiler-rs | 0.5.2 | MIT |
| @astrojs/internal-helpers | 0.12.0 | MIT |
| @astrojs/markdown-satteri | 0.4.3 | MIT |
| @astrojs/prism | 4.0.2 | MIT |
| @astrojs/react | 7.0.1 | MIT |
| @astrojs/sitemap | 3.7.4 | MIT |
| @astrojs/telemetry | 3.3.3 | MIT |
| @babel/helper-string-parser | 7.29.7 | MIT |
| @babel/helper-validator-identifier | 7.29.7 | MIT |
| @babel/parser | 7.29.9 | MIT |
| @babel/types | 7.29.8 | MIT |
| @bruits/satteri-darwin-arm64 | 0.10.5 | MIT |
| @capsizecss/unpack | 4.0.1 | MIT |
| @clack/core | 1.5.1 | MIT |
| @clack/prompts | 1.8.1 | MIT |
| @fontsource-variable/inter | 5.3.0 | OFL-1.1 |
| @fontsource-variable/jetbrains-mono | 5.3.0 | OFL-1.1 |
| @hono/node-server | 2.1.5 | MIT |
| @img/colour | 1.1.0 | MIT |
| @img/sharp-darwin-arm64 | 0.35.5 | Apache-2.0 |
| @img/sharp-libvips-darwin-arm64 | 1.3.4 | LGPL-3.0-or-later |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT |
| @modelcontextprotocol/sdk | 1.32.1 | MIT |
| @oslojs/encoding | 1.1.0 | MIT |
| @oxc-project/types | 0.154.0 | MIT |
| @rolldown/binding-darwin-arm64 | 1.2.14 | MIT |
| @rolldown/pluginutils | 1.0.1 | MIT |
| @shikijs/core | 4.5.0 | MIT |
| @shikijs/engine-javascript | 4.5.0 | MIT |
| @shikijs/engine-oniguruma | 4.5.0 | MIT |
| @shikijs/langs | 4.5.0 | MIT |
| @shikijs/primitive | 4.5.0 | MIT |
| @shikijs/themes | 4.5.0 | MIT |
| @shikijs/types | 4.5.0 | MIT |
| @shikijs/vscode-textmate | 10.0.2 | MIT |
| @types/estree | 1.0.9 | MIT |
| @types/estree-jsx | 1.0.5 | MIT |
| @types/hast | 3.0.5 | MIT |
| @types/mdast | 4.0.4 | MIT |
| @types/nlcst | 2.0.3 | MIT |
| @types/node | 22.20.5, 24.19.2 | MIT |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |
| @types/sax | 1.2.7 | MIT |
| @types/unist | 3.0.3 | MIT |
| @ungap/structured-clone | 1.4.0 | ISC |
| @vitejs/plugin-react | 6.1.2 | MIT |
| accepts | 2.0.0 | MIT |
| ajv | 8.20.0 | MIT |
| ajv-formats | 3.0.1 | MIT |
| am-i-vibing | 0.5.0 | MIT |
| anymatch | 3.1.3 | ISC |
| arg | 5.0.2 | MIT |
| aria-query | 5.3.2 | Apache-2.0 |
| astro | 7.3.8 | MIT |
| axobject-query | 4.1.0 | Apache-2.0 |
| bail | 2.0.2 | MIT |
| body-parser | 2.3.0 | MIT |
| boolbase | 1.0.0 | ISC |
| bytes | 3.1.2 | MIT |
| call-bind-apply-helpers | 1.0.2 | MIT |
| call-bound | 1.0.4 | MIT |
| ccount | 2.0.1 | MIT |
| character-entities-html4 | 2.1.0 | MIT |
| character-entities-legacy | 3.0.0 | MIT |
| chokidar | 5.0.0 | MIT |
| ci-info | 4.4.0 | MIT |
| clsx | 2.1.1 | MIT |
| comma-separated-tokens | 2.0.3 | MIT |
| commander | 11.1.0 | MIT |
| common-ancestor-path | 2.0.0 | BlueOak-1.0.0 |
| content-disposition | 2.0.1 | MIT |
| content-type | 1.0.5, 2.1.0 | MIT |
| cookie | 0.7.2, 2.0.1 | MIT |
| cookie-es | 1.2.3 | MIT |
| cookie-signature | 1.2.2 | MIT |
| cors | 2.8.6 | MIT |
| cross-spawn | 7.0.6 | MIT |
| crossws | 0.3.5 | MIT |
| css-select | 6.0.0 | BSD-2-Clause |
| css-tree | 2.2.1, 3.2.1 | MIT |
| css-what | 7.0.0 | BSD-2-Clause |
| csso | 5.0.5 | MIT |
| csstype | 3.2.3 | MIT |
| debug | 4.4.3 | MIT |
| defu | 6.1.7 | MIT |
| depd | 2.0.0 | MIT |
| dequal | 2.0.3 | MIT |
| destr | 2.0.5 | MIT |
| detect-libc | 2.1.2 | Apache-2.0 |
| devalue | 5.9.4 | MIT |
| devlop | 1.1.0 | MIT |
| diff | 9.0.0 | BSD-3-Clause |
| dom-serializer | 2.0.0 | MIT |
| domelementtype | 2.3.0 | BSD-2-Clause |
| domhandler | 5.0.3 | BSD-2-Clause |
| domutils | 3.2.2 | BSD-2-Clause |
| dset | 3.1.4 | MIT |
| dunder-proto | 1.0.1 | MIT |
| ee-first | 1.1.1 | MIT |
| encodeurl | 2.0.0 | MIT |
| entities | 4.5.0 | BSD-2-Clause |
| es-define-property | 1.0.1 | MIT |
| es-errors | 1.3.0 | MIT |
| es-module-lexer | 3.0.3 | MIT |
| es-object-atoms | 1.1.2 | MIT |
| escape-html | 1.0.3 | MIT |
| etag | 1.8.1 | MIT |
| eventemitter3 | 5.0.4 | MIT |
| eventsource | 3.0.7 | MIT |
| eventsource-parser | 3.1.1 | MIT |
| express | 5.3.0 | MIT |
| express-rate-limit | 8.7.1 | MIT |
| extend | 3.0.2 | MIT |
| fast-deep-equal | 3.1.3 | MIT |
| fast-string-truncated-width | 3.0.3 | MIT |
| fast-string-width | 3.0.2 | MIT |
| fast-uri | 3.1.8 | BSD-3-Clause |
| fast-wrap-ansi | 0.2.2 | MIT |
| fdir | 6.5.0 | MIT |
| finalhandler | 2.1.1 | MIT |
| find-proc | 0.2.0 | MIT |
| flattie | 1.1.1 | MIT |
| fontace | 0.4.1 | MIT |
| fontkitten | 1.0.3 | MIT |
| forwarded | 0.2.0 | MIT |
| fresh | 2.0.0 | MIT |
| fsevents | 2.3.3 | MIT |
| function-bind | 1.1.2 | MIT |
| get-intrinsic | 1.3.0 | MIT |
| get-proto | 1.0.1 | MIT |
| get-tsconfig | 5.0.0-beta.6 | MIT |
| github-slugger | 2.0.0 | ISC |
| gopd | 1.2.0 | MIT |
| h3 | 1.15.11 | MIT |
| has-symbols | 1.1.0 | MIT |
| hasown | 2.0.4 | MIT |
| hast-util-to-html | 9.0.5 | MIT |
| hast-util-whitespace | 3.0.0 | MIT |
| hono | 4.13.13 | MIT |
| html-escaper | 3.0.3 | MIT |
| html-void-elements | 3.0.0 | MIT |
| http-cache-semantics | 4.3.0 | BSD-2-Clause |
| http-errors | 2.0.1 | MIT |
| iconv-lite | 0.7.3 | MIT |
| inherits | 2.0.4 | ISC |
| ip-address | 10.7.4 | MIT |
| ipaddr.js | 1.9.1 | MIT |
| iron-webcrypto | 1.2.1 | MIT |
| is-docker | 4.0.0 | MIT |
| is-plain-obj | 4.1.0 | MIT |
| is-promise | 4.0.0 | MIT |
| isexe | 2.0.0 | ISC |
| jiti | 2.7.0 | MIT |
| jose | 6.2.12 | MIT |
| json-schema-traverse | 1.0.0 | MIT |
| json-schema-typed | 8.0.2 | BSD-2-Clause |
| jsonc-parser | 3.3.1 | MIT |
| lightningcss | 1.33.0 | MPL-2.0 |
| lightningcss-darwin-arm64 | 1.33.0 | MPL-2.0 |
| lru-cache | 11.5.3 | BlueOak-1.0.0 |
| magic-string | 1.4.3 | MIT |
| magicast | 0.5.5 | MIT |
| math-intrinsics | 1.1.0 | MIT |
| mdast-util-to-hast | 13.2.1 | MIT |
| mdn-data | 2.0.28, 2.27.1 | CC0-1.0 |
| media-typer | 1.1.1 | MIT |
| merge-descriptors | 2.0.0 | MIT |
| micromark-util-character | 2.1.1 | MIT |
| micromark-util-encode | 2.0.1 | MIT |
| micromark-util-sanitize-uri | 2.0.1 | MIT |
| micromark-util-symbol | 2.0.1 | MIT |
| micromark-util-types | 2.0.3 | MIT |
| mime-db | 1.54.0 | MIT |
| mime-types | 3.0.2 | MIT |
| mrmime | 2.0.1 | MIT |
| ms | 2.1.3 | MIT |
| nanoid | 3.3.20 | MIT |
| negotiator | 1.1.0 | MIT |
| neotraverse | 1.0.1 | MIT |
| nlcst-to-string | 4.0.0 | MIT |
| node-fetch-native | 1.6.7 | MIT |
| node-mock-http | 1.0.5 | MIT |
| normalize-path | 3.0.0 | MIT |
| nth-check | 2.1.1 | BSD-2-Clause |
| object-assign | 4.1.1 | MIT |
| object-inspect | 1.13.4 | MIT |
| obug | 3.0.0 | MIT |
| ofetch | 1.5.1 | MIT |
| ohash | 2.0.12 | MIT |
| on-finished | 2.4.1 | MIT |
| once | 1.4.0 | ISC |
| oniguruma-parser | 0.12.2 | MIT |
| oniguruma-to-es | 4.3.6 | MIT |
| p-limit | 7.3.3 | MIT |
| p-queue | 9.3.5 | MIT |
| p-timeout | 7.0.2 | MIT |
| package-manager-detector | 1.9.0 | MIT |
| parseurl | 1.3.3 | MIT |
| path-key | 3.1.1 | MIT |
| path-to-regexp | 8.4.2 | MIT |
| piccolore | 0.1.3 | ISC |
| picocolors | 1.1.1 | ISC |
| picomatch | 2.3.2, 4.0.7 | MIT |
| pkce-challenge | 5.0.1 | MIT |
| postcss | 8.5.30 | MIT |
| prismjs | 1.30.0 | MIT |
| process-ancestry | 0.1.0 | MIT |
| property-information | 7.2.0 | MIT |
| proxy-addr | 2.0.8 | MIT |
| qs | 6.16.1 | BSD-3-Clause |
| radix3 | 1.1.2 | MIT |
| range-parser | 1.3.0 | MIT |
| raw-body | 3.0.2 | MIT |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| readdirp | 5.1.1 | MIT |
| regex | 6.1.0 | MIT |
| regex-recursion | 6.0.2 | MIT |
| regex-utilities | 2.3.0 | MIT |
| require-from-string | 2.0.2 | MIT |
| resolve-pkg-maps | 1.0.0 | MIT |
| retext-smartypants | 6.2.0 | MIT |
| rolldown | 1.2.14 | MIT |
| router | 2.2.0 | MIT |
| safer-buffer | 2.1.2 | MIT |
| satteri | 0.10.5 | MIT |
| sax | 1.6.1 | BlueOak-1.0.0 |
| scheduler | 0.28.0 | MIT |
| semver | 7.8.5 | ISC |
| send | 1.2.1 | MIT |
| serve-static | 2.2.1 | MIT |
| setprototypeof | 1.2.0 | ISC |
| sharp | 0.35.5 | Apache-2.0 |
| shebang-command | 2.0.0 | MIT |
| shebang-regex | 3.0.0 | MIT |
| shiki | 4.5.0 | MIT |
| side-channel | 1.1.1 | MIT |
| side-channel-list | 1.0.1 | MIT |
| side-channel-map | 1.0.1 | MIT |
| side-channel-weakmap | 1.0.2 | MIT |
| sisteransi | 1.0.5 | MIT |
| sitemap | 9.0.1 | MIT |
| smol-toml | 1.9.1 | BSD-3-Clause |
| source-map-js | 1.2.2 | BSD-3-Clause |
| space-separated-tokens | 2.0.2 | MIT |
| statuses | 2.0.2 | MIT |
| stringify-entities | 4.0.4 | MIT |
| svgo | 4.1.0 | MIT |
| tiny-inflate | 1.0.3 | MIT |
| tinyclip | 1.0.3 | MIT |
| tinyexec | 1.3.1 | MIT |
| tinyglobby | 0.2.17 | MIT |
| toidentifier | 1.0.1 | MIT |
| trim-lines | 3.0.1 | MIT |
| trough | 2.2.0 | MIT |
| type-is | 2.1.0 | MIT |
| ufo | 1.6.4 | MIT |
| ultrahtml | 1.7.0 | MIT |
| uncrypto | 0.1.3 | MIT |
| undici | 8.12.1 | MIT |
| undici-types | 6.21.0, 7.24.6 | MIT |
| unified | 11.0.5 | MIT |
| unifont | 0.7.5 | MIT |
| unist-util-is | 6.0.1 | MIT |
| unist-util-position | 5.0.0 | MIT |
| unist-util-stringify-position | 4.0.0 | MIT |
| unist-util-visit | 5.1.0 | MIT |
| unist-util-visit-parents | 6.0.2 | MIT |
| unpipe | 1.0.0 | MIT |
| unstorage | 1.17.6 | MIT |
| vary | 1.1.2 | MIT |
| verkit | 0.5.0 | MIT |
| vfile | 6.0.3 | MIT |
| vfile-message | 4.0.3 | MIT |
| vite | 8.3.4 | MIT |
| vitefu | 1.1.3 | MIT |
| which | 2.0.2 | ISC |
| wrappy | 1.0.2 | ISC |
| ws | 8.22.0 | MIT |
| xxhash-wasm | 1.1.0 | MIT |
| yaml | 2.9.1 | ISC |
| yargs-parser | 22.0.0 | ISC |
| yocto-queue | 1.2.2 | MIT |
| zod | 4.6.7 | MIT |
| zod-to-json-schema | 3.25.2 | ISC |
| zwitch | 2.0.4 | MIT |
