import is from './is.js';
import { decodeMap } from "./src/decodeMap.js";
import { regexDecode } from "./src/regexDecode.js";
import { decodeMapLegacy } from "./src/decodeMapLegacy.js";
import { decodeMapNumeric } from "./src/decodeMapNumeric.js";
import { invalidReferenceCodePoints } from "./src/invalidReferenceCodePoints.js";

class ThinkError extends Error {
   constructor(msg, code = 'THINK_ERROR') {
      super(msg);
      this.name = 'ThinkError';
      this.code = code;
   }
}

export class Travex {
   constructor() {
      this.isPrefix = ['>', '=', ':'];
      this.escape = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      this.prop = (key) => this.escape(key);
      this.prefixes = (prefix, noPrefix) => prefix ? [prefix] : noPrefix ? [''] : ['og', 'fb', 'twitter', 'article', 'video'];
      this.attrName = '(?:itemprop|name|property)';
      this.contentAttr = 'content\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^"\'\\s>=]+))';
      this.tagStart = '<meta\\b[^>]*';
      this.tagEnd = '\\s*[^>]*>';
   }

   createRegex(pattern, flags) {
      const mergeFlags = [...new Set((pattern.flags + flags).split(''))].join('');
      return pattern instanceof RegExp
         ? new RegExp(pattern.source, mergeFlags)
         : new RegExp(pattern, flags);
   }

   traverse(pattern, input, options = {}) {
      const {
         fatal=false,
         debug=false,
         flatten=false,
         unique=false,
         fallback=null,
         limit=null,
         find=null,
         group=null,
         filter=null,
         default:def=null
      } = options ?? { };

      const parseKeyPath = (path) => {
         const splitter = this.isPrefix.find(p => is.string(path) && path.includes(p));

         if (Array.isArray(path)) {
            return path.flatMap(k => {
               if (is.string(k) && splitter && k.includes(splitter)) {
                  return k.split(splitter);
               } else {
                  return [k];
               }
            });
         }

         if (is.string(path)) {
            if (splitter) {
               return path.split(splitter);
            } else {
               return [path];
            }
         }

         return [];
      };

      const deepSearch = (obj, path) => {
         try {
            const keys = parseKeyPath(path);

            if (obj == null || keys.length === 0) {
               return keys.length === 0 ? obj : undefined;
            }

            const [current, ...rest] = keys;

            if (current === '...') {
               const results = [];
               async function recur(target) {
                  if (Array.isArray(target)) {
                     for (const item of target) {
                        const res = deepSearch(item, ['...', ...rest]);
                        if (res != null) {
                           results.push(...(Array.isArray(res) ? res : [res]));
                        }
                     }
                  }
                  else if (is.object(target) && target !== null) {
                     const direct = target?.[rest[0]];

                     if (direct !== undefined) {
                        const res = deepSearch(direct, rest.slice(1));
                        if (res != null) {
                           results.push(res);
                        }
                     }

                     for (const val of Object.values(target)) {
                        const res = deepSearch(val, ['...', ...rest]);
                        if (res != null) {
                           results.push(...(Array.isArray(res) ? res : [res]));
                        }
                     }
                  }
               }

               recur(obj);
               return results.length === 0
                  ? undefined
                  : results.length === 1
                     ? results[0]
                     : results;
            }

            const next = Array.isArray(obj) ? obj.map(item => item?.[current]).filter(Boolean).flat() : obj?.[current];

            return deepSearch(next, rest);
         }
         catch (e) {
            if (fatal) {
               throw new ThinkError(`deepSearch() failed for path "${path}": ${e.message}`);
            }
            return undefined;
         }
      };

      const findFilter = (items,conditions) => {
         if (!Array.isArray(items) || !conditions?.length) {
            return items;
         }

         const key = conditions.find(x => !this.isPrefix.some(p => x.includes(p)));
         const filters = conditions.filter(x => this.isPrefix.some(p => x.includes(p)));

         const filtered = [];
         for (const entry of items) {
            const match = [];

            for (const cond of filters) {
               const op = this.isPrefix.find(p => cond.includes(p));

               if (!op) {
                  match.push(false);
                  continue;
               }

               const [k, val] = cond.split(op);
               const actual = deepSearch(entry, parseKeyPath(k));
               match.push(actual != null && actual == val);
            }

            if (match.every(Boolean)) {
               filtered.push(entry);
            }
         }

         if (key) {
            const values = [];

            for (const entry of filtered) {
               const value = deepSearch(entry, parseKeyPath(key));
               if (value != null) {
                  values.push(value);
               }
            }

            return values.length === 1 ? values[0] : values;
         }

         return filtered.length === 1 ? filtered[0] : filtered;
      };

      let keys;

      if (Array.isArray(pattern)) {
         keys = pattern;
      } else if (pattern == null) {
         throw new ThinkError('Pattern is null or undefined.', 'INVALID_INPUT');
      } else {
         keys = [pattern];
      }

      let tasks = [];

      const search = (key) => {
         let found = deepSearch(input, key);

         if (found !== null && is.string(key) && [".", "#"].some(i => key.startsWith(i))) {
            found = deepSearch(input, ['...', key.slice(1)]);
         } else {
            found = found;
         }

         if (debug) {
            console.log(`\x1b[90m[DEBUG]:\x1b[0m Key: "${key}" Got:`, found);
         }
         found != null ? Array.isArray(found) ? tasks.push(...found) : tasks.push(found) : null;
      }

      for (const key of keys) {
         search(key);
      }

      if (tasks.length === 0 && fallback) {
         const fallbackKeys = Array.isArray(fallback) ? fallback : [fallback];
         for (const key of fallbackKeys) {
            search(key);
            if (tasks.length) break;
         }
      }

      let final = tasks.length > 0
         ? tasks.length === 1
            ? tasks[0]
            : tasks
         : def;

      if (group != null && typeof group === 'number') {
         if (group > 0 && Array.isArray(final)) {
            final = final[group - 1] ?? final;
         }
      }

      const limitNum = is.number(limit) ? limit >>> 0 : null;

      if (flatten && Array.isArray(final)) {
         final = final.flat(Infinity);
      } else {
         final = final;
      }

      if (unique && Array.isArray(final)) {
         final = [...new Set(final)];
      } else {
         final = final;
      }

      if (limitNum && final.length > limitNum) {
         final = final.slice(0, limitNum);
      } else {
         final = final;
      }

      if (find) {
         final = findFilter(Array.isArray(final) ? final : [final], find);
      } else {
         final = final;
      }

      if (filter && is.function(filter)) {
         final = filter(final);
      } else {
         final = final;
      }

      return final;
   }

   async decode(input, options = {}) {
      const {
         isAttributeValue=false,
         fatal=false,
      } = options;

      try {
         if (input == null || (!is.string(input) && !is.object(input))) {
            return input;
         }

         if (Array.isArray(input)) {
            return await Promise.all(
               input.map(async item => {
                  if (item == null || (!is.string(item) && !is.object(item))) return item;
                  if (Array.isArray(item)) {
                     return await Promise.all(item.map(i => this.decode(i, options)));
                  }
                  if (is.object(item)) {
                     const result = {};
                     await Promise.all(
                        Object.entries(item).map(async ([key, value]) => {
                           result[key] = await this.decode(value, options);
                        })
                     );
                     return result;
                  }
                  return await this.decode(item, options);
               })
            );
         }

         if (is.object(input)) {
            const result = {};
            await Promise.all(
               Object.entries(input).map(async ([key, value]) => {
                  result[key] = await this.decode(value, options);
               })
            );
            return result;
         }

         if (fatal && /&#(?:[xX][^a-fA-F0-9]|[^0-9xX])/.test(input)) {
            throw new ThinkError('Malformed character reference', 'MALFORMED_REFERENCE');
         }

         return await new Promise((resolve, reject) => {
            try {
               const result = input.replace(regexDecode, (
                  match,
                  named,
                  legacy,
                  legacyExtra,
                  decDigits,
                  decSemicolon,
                  hexDigits,
                  hexSemicolon
               ) => {
                  if (named) {
                     return decodeMap[named] || match;
                  }

                  if (legacy) {
                     if (legacyExtra && isAttributeValue) {
                        if (fatal && legacyExtra === '=') {
                           throw new ThinkError('`&` did not start a character reference', 'INVALID_REFERENCE');
                        }
                        return match;
                     }
                     if (fatal) {
                        throw new ThinkError('Named character reference was not terminated by a semicolon', 'MISSING_SEMICOLON');
                     }
                     return (decodeMapLegacy[legacy] || '') + (legacyExtra || '');
                  }

                  let codePoint;

                  if (decDigits) {
                     if (fatal && !decSemicolon) {
                        throw new ThinkError('Character reference was not terminated by a semicolon', 'MISSING_SEMICOLON');
                     }
                     codePoint = parseInt(decDigits, 10);
                  } else if (hexDigits) {
                     if (fatal && !hexSemicolon) {
                        throw new ThinkError('Character reference was not terminated by a semicolon', 'MISSING_SEMICOLON');
                     }
                     codePoint = parseInt(hexDigits, 16);
                  } else {
                     if (fatal) {
                        throw new ThinkError('Named character reference was not terminated by a semicolon', 'MISSING_SEMICOLON');
                     }
                     return match;
                  }

                  if ((codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint > 0x10FFFF) {
                     if (fatal) throw new ThinkError('Character reference outside permissible Unicode range', 'INVALID_CODE_POINT');
                     return '\uFFFD';
                  }

                  if (decodeMapNumeric.hasOwnProperty(codePoint)) {
                     if (fatal) throw new ThinkError('Disallowed character reference', 'DISALLOWED_REFERENCE');
                     return decodeMapNumeric[codePoint];
                  }

                  if (fatal && invalidReferenceCodePoints.includes(codePoint)) {
                     throw new ThinkError('Disallowed character reference', 'DISALLOWED_REFERENCE');
                  }

                  if (codePoint > 0xFFFF) {
                     codePoint -= 0x10000;
                     return String.fromCharCode(
                        (codePoint >>> 10) & 0x3FF | 0xD800,
                        codePoint & 0x3FF | 0xDC00
                     );
                  }

                  return String.fromCharCode(codePoint);
               });

               resolve(result);
            } catch (error) {
               reject(error);
            }
         });

      } catch (error) {
         if (fatal) {
            throw new ThinkError(`Decoding failed: ${error.message}`, 'DECODE_ERROR');
         }
         return input;
      }
   }

   async parseJson(input, options = {}) {
      const {
         fatal=true,
         transformSource=null,
         ignore_extra=false,
      } = options;

      if (!is.string(input)) {
         if (fatal) {
            throw new ThinkError('Input must be a string', 'INVALID_INPUT');
         }
         return null;
      }

      if (!is.null(transformSource) && !is.function(transformSource)) {
         if (fatal) throw new ThinkError('transformSource must be a function or null', 'INVALID_TRANSFORM');
         return null;
      }

      try {
         const result = await new Promise((resolve, reject) => {
            try {
               const parsed = JSON.parse(input, (key, value) => {
                  if (typeof transformSource === 'function') {
                     try {
                        return transformSource(key, value);
                     } catch {
                        return value;
                     }
                  }
                  return value;
               });
               resolve(parsed);
            } catch (error) {
               reject(error);
            }
         });

         const isValid = result != null && (
            (Array.isArray(result) && result.length > 0) ||
            (typeof result === 'object' && Object.keys(result).length > 0)
         );

         return isValid ? result : null;
      } catch (error) {
         if (fatal) {
            throw new ThinkError(`JSON parsing failed: ${error.message}`, 'JSON_PARSE_ERROR');
         }
         return null;
      }
   }

   async search(patterns, input=null, options={}) {
      const {
         match=1,
         group=null,
         caseSensitive=true,
         transformSource=null,
      } = options ?? { };

      if (input == null) {
         throw new ThinkError('Input string is null or undefined', 'INVALID_INPUT');
      }

      const patternList = Array.isArray(patterns) ? patterns : [patterns];

      if (patternList.length > 0x10000 >>> 5) {
         throw new ThinkError(`Too many patterns (limit: ${maxPattern})`, 'PATTERN_LIMIT');
      }

      let tasks = [];

      for (const pattern of patternList) {
         const regex = this.createRegex(pattern, caseSensitive ? 'g' : 'gi');
         for (const m of input.matchAll(regex)) {
            const captures = Array.isArray(m[match]) ? m[match] : [m[match]];
            for (const capture of captures) {
               tasks.push(await this.parseJson(capture, { fatal: true, transformSource }).catch(() => capture));
            }
         }
      }

      const results = await Promise.all(tasks);

      if (group != null && typeof group === 'number') {
         if (group > 0 && Array.isArray(results)) {
            return results[group - 1] ?? results;
         }
      }

      return results.length === 1
         ? results[0]
         : results;
   }

   async meta(pattern, input=null, options={}) {
      const {
         fatal=false,
         caseSensitive=true,
         default:def=null
      } = options ?? { };

      if (input == null) {
         throw new ThinkError('Input HTML is null or undefined', 'INVALID_INPUT');
      }

      const patternArray = Array.isArray(pattern)
         ? pattern
         : [pattern];

      const buildMetaRegexes = (key, { prefix = null, noPrefix = null } = {}) => {
         return this.prefixes(prefix, noPrefix).flatMap(pfx => {
            const keyMatch = `(?:"${key}"|${key}|'${key}')`;
            const propMatch = pfx
               ? `${this.attrName}\\s*=\\s*(?:"${pfx}:${this.prop(key)}"|'${pfx}:${this.prop(key)}'|${pfx}:${this.prop(key)}|${keyMatch})`
               : `${this.attrName}\\s*=\\s*(?:"${this.prop(key)}"|'${this.prop(key)}'|${this.prop(key)})`;
            return [
               `${this.tagStart}${propMatch}\\s*${this.contentAttr}${this.tagEnd}`,
               `${this.tagStart}${this.contentAttr}\\s*${propMatch}${this.tagEnd}`
            ];
         });
      };

      for (const regex of patternArray.flatMap(p => buildMetaRegexes(p))) {
         const result = await this.search(regex, input, { caseSensitive });
         if (result?.length) {
            const content = Array.isArray(result) ? result.find(x => x != null) : result;
            return content ?? [content];
         }
      }

      if (fatal) {
         throw new ThinkError('No meta tags found', 'NO_MATCH');
      }

      return def;
   }
}