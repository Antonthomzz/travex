# Travex
<div align="center">

[![NPM Version](https://img.shields.io/npm/v/travex?color=brightgreen&label=Version&style=for-the-badge)](https://www.npmjs.com/package/travex "NPM Package")
[![NPM Downloads](https://img.shields.io/npm/dm/travex?label=Downloads&style=for-the-badge)](https://www.npmjs.com/package/travex "Downloads")
[![Donate](https://img.shields.io/badge/-Donate-red.svg?logo=githubsponsors&labelColor=555555&style=for-the-badge)](https://github.com/sponsors/Antonthomzz "Support Development")

</div>

## Features

- **Path-Based Traversal**: Navigate nested data using string paths (e.g., `"user>name"`) or arrays of paths.
- **Configurable Options**:
  - `default`: Specify a fallback value when no data is found.
  - `fallback`: Define alternative paths to try if the primary path fails.
  - `flatten`: Flatten nested arrays in the result for simpler output.
  - `unique`: Remove duplicates from array results.
  - `limit`: Restrict the number of items in array outputs.
  - `debug`: Enable debug mode to log traversal details (integrates with external logging).
  - `Find`: Search for data at a specified path.
  - `Filter`: Apply a custom function to filter or transform results.
  - `group`: Select or group results based on an index or logic.
- **Error Handling**: Validates inputs and configurations, throwing clear errors for invalid JSON, paths, or options.
- **Flexible Output**: Returns results with a `value` property and additional methods (`Find`, `Filter`, `group`) for further processing.

## Installation

1. Ensure Node.js is installed on your system.
2. Clone or download the repository containing the traversal tool.
3. Install dependencies (if any) by running:

```bash
npm install travex
```
4. Include the traversal tool in your project:

```javascript
import { (Traverse|Findall|Meta|Decode) } from 'travex';
```

### Basic Setup

Set up the tool by defining the input data and traversal path:

```javascript
import { Traverse } from 'travex';

var result = Traverse(".value", {"data":{"name":{"value":"Anton"}}})
console.log(result); // Output: "Anton"
```

#### Available Options

- `default`: Specifies a value to return if no data is found at the given path or fallback paths.
  - Example:

    ```javascript
    import { Traverse } from 'travex';

    var result = Traverse('.anton', {}, { default: 'Not found' });
    console.log(result); // Output: "Not found"
    ```
- `fallback`: Defines alternative paths (string or array of strings) to try if the primary path yields no result.
  - Example:

    ```javascript
    import { Traverse } from 'travex';

    var result = Traverse('anton', {"data":{"name":"Anton"}}, { fallback: ['tes1', 'data>name'] });
    console.log(result); // Output: "Anton"
    ```
- `flatten`: When `true`, flattens nested arrays in the result into a single array.
  - Example:

    ```javascript
    import { Traverse } from 'travex';

    var result = Traverse('list', {"list":[[1,2],[3,4]]}, { flatten: true });
    console.log(result); // Output: [1, 2, 3, 4]
    ```
- `unique`: When `true`, removes duplicates from array results using a `Set`.
  - Example:

    ```javascript
    import { Traverse } from 'travex';

    var result = Traverse('items', {"items":[1,1,2,2,3]}, { unique: true });
    console.log(result); // Output: [1, 2, 3]
    ```
- `limit`: Restricts the number of items in array results to the specified positive integer.
  - Example:

    ```javascript
    import { Traverse } from 'travex';

    var result = Traverse('numbers', {"numbers":[1,2,3,4,5]}, { limit: 3 });
    console.log(result); // Output: [1, 2, 3]
    ```
  - Throws `TypeError` if `limit` is not a positive integer.
- `debug`: When `true`, enables debug mode to log traversal details (requires external logging setup, e.g., with `TestSuite`).
  - Example:

    ```javascript
    import { Traverse } from 'travex';

    Traverse('data>value', {"data":{"value":42}}, {
       debug: true
    }); // Output: [DEBUG]: Key: "data>value" Got: 42
    ```
- `find`: search for metadata and then validate it with other data on the surface.
  - Example:

    ```javascript
    import { Traverse } from 'travex';

    var result = Traverse("data", {"data":[{"name":"Anton","age":20},{"name":"Tiara","age":17}]}, {
       find: ["name", "age:20"]
    });
    console.log(result); // Output: Anton
    ```
- `filter`: Applies a custom function to filter or transform the result. If no function is provided, returns the original result.
  - Example:

    ```javascript
    import { Traverse } from 'travex';

    var result = Traverse("num", {"num": 10}, { filter: p => p * 10 });
    console.log(result); // Output: 100
    ```
- `group`: Selects or groups results based on an index (`n`) or logic. If `n` is a positive number, selects the element at index `n-1`. If `n` is 0 or omitted, processes the entire result.
  - Example:

    ```javascript
    import { Traverse } from 'travex';

    var result = Traverse("items", {"items":["apple","banana","orange"]}, { group: 2 });
    console.log(result); // Output: banana
    ```

### Advanced Usage Examples

- `search_regex`: search data based on `RegExp`
  ```javascript
  import { Findall } from 'travex';

  (async (input) => {
     var result = await Findall("<title>(.*?)<title>", input);
     console.log(result); // Output: "Follow github antonthomzz (https://github.com/Antonthomzz)"
  })('<title>Follow github antonthomzz (https://github.com/Antonthomzz)<title>');
```

### Error Handling

- **Invalid Input**: Throws `TypeError` if `input` is not a valid object or JSON string (e.g., `traverse.isObject` or JSON parse errors).
- **Invalid Path**: Returns `null` or the `default` value if no data is found, with fallback paths attempted if specified.
- **Invalid Options**: Throws `TypeError` for invalid option values (e.g., non-boolean `flatten`, non-positive integer `limit`).
- **Empty Data**: Throws `TypeError` (`traverse.data_not_found`) if the traversal path is invalid or empty without a `default` or `fallback`.

## License (MIT)

This project is licensed under the MIT License. See the `LICENSE` file for details.