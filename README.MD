# GFLoader

This library allows to load Google Fonts exhibited at `fonts.googleapis.com`.

# Installation

Include the `gfloader.js` file in your webpage. This library only works in
browsers, it is not intended to run in NodeJS or similar. We recommend to use
some process and minify the library before serving in production. Remember to
preserve the copyright notice, as required by MIT License.

# Methods

`GFLoader.append(family): Promise`

Appends a font CSS given its family. If you want to load the default font style
(weight 400, latin), just pass the font name to this function. The "family"
argument also accepts an object with the fields:

 - `family` (String) with the family name (case sensitive);
 - `weight` (Number or Array) with the weight or an array of weights;
 - `subset` (String or Array) with the character subset of the family.

The function returns a Promise object and you can define its callback calling
the functions `.then(callback)` or `.catch(callback)`.

`GFLoader.exists(family): Promise`

Detect whether the font family exists or not. This function makes a HEAD request
in the Google Fonts server and watch its result. If it returns 200 OK, the font
exists.

Argument `family` (String) is the font family to check. It is a case-sensitive
string with the name of the font family.

The function returns a Promise to handle its result.

There is no way to differenciate the result of a network error from an invalid
font family. This occurs because both cases returns an invalid error with status
0. While Google Fonts API sends an HTTP 400, the cross-origin policy intercepts
the error page and converts the status to 0. This status is ambiguous with other
possible errors.

`GFLoader.exists_weight(family, weight): Promise`

This function is very like the `exists` function, but also accept an extra
argument to test against a specific font weight.

Argument `weight` accepts the font weight as string or number. It also can be an
array with strings and numbers representing the desired font weights. If the
argument is an array, it will return true whether any of the weights exist.

The function returns a Promise to handle its result.

See `exists` function for further information.

`GFLoader.info(family): Promise`

Returns some useful informations about the font family. When the execution goes
well, the first argument passed to the callback function of `.then(callback)` is
an object with the fields `weight` and `subset`.

Field `weight` holds a plain object that maps the font weight and its ability to
be normal and/or italic. Each weight is an object with the fields `normal` and
`italic`. In other hand, field `subset` stores the valid character subsets. Each
item is a field of the `subset` object, whose field name is the subset and the
field value is always `true`.

`GFLoader.stylize(element, family, fallback='sans-serif'): Promise`

Load the font CSS, if necessary, and set the inline `style` attribute on the
given element, adjusting its `font-family` and `font-weight`.

The `element` argument can be anything that jQuery can turns into an object or
group of objects. If no element can be retrieved, the function has the same
effect as `append`.

The `family` element can be a string or object, like the `append` function.

Argument `fallback` accepts `"sans-serif"`, `"serif"` or `"monospace"`.

The function returns a Promise to handle its success or fail.