/**
 * MIT License
 * Copyright (c) 2017 Eliakim Zacarias
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

/**
 * This library allow to check and retrieve fonts from Google Fonts. It appends
 * <link> elements to the page <head> section to allow the usage of fonts on
 * programmatic demand.
 *
 * Notes:
 *   - There are no mechanisms to prevent forgery of invalid URL. If you want
 *     this mechanism you must filter the values of family, weight and subset
 *     before sending to these functions.
 */

(function(){
    /**
     * We need jQuery to get $.get function for Ajax and other shorthands to
     * manage the <link> tag.
     */
    if(! jQuery)
        throw new ReferenceError('jQuery is required to proceed')

    /**
     * Default URL to Google Fonts API.
     * @type {String}
     */
    var FontsGoogleApis = 'https://fonts.googleapis.com/css?family=';

    /**
     * Create a Promise-like object instead of depending on browser's Promise.
     * 
     * @param  {Function} starter  The function(resolve,reject) to run.
     * @return {Promise}           Promise's result (only functions .then and .catch).
     * @see <https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Promise>
     */
    function create_promise(starter){
        var promiseResult = {
            '$$then':null,
            '$$catch':null,
            'then':function(callback, optionalCatch){
                this.$$then = callback
                if (optionalCatch)
                    this.$$catch = optionalCatch
                return this
            },
            'catch':function(callback){
                this.$$catch = callback
                return this
            }
        }
        var resolve = function(...args){ promiseResult.$$then && promiseResult.$$then(...args) }
        var reject = function(...args){ promiseResult.$$catch && promiseResult.$$catch(...args) }
        setTimeout(function(){ starter(resolve, reject) }, 50)
        return promiseResult
    }

    /**
     * Check if the font family name is valid in the Google server.
     * 
     * This function makes a HEAD request to Google, if the server return 200 OK,
     * that font exists, otherwise it doesn't exist.
     * 
     * Note this function is unable to diff from invalid font and network failure
     * because of the way Google manage errors. Its error page causes a cross-site
     * exception which turns into status 0, and network connection are also status 0.
     *
     * Note:
     * If the cross-origin behavior is modified, the `then` callback for $.ajax
     * and $.get must be updated to verify the 200 OK response status. For now
     * it is trivial, once the page is not loaded and a successful load of a page
     * with status 400 Bad Request will never occur.
     * 
     * @param  {String} family  The font name.
     * @return {Promise}        The promise of result.
     */
    function exists_function(family){
        var it = this
        if (it.$loaded[family])
            return create_promise(function(resolve){ resolve(true) })
        return create_promise(function(resolve, reject){
            $.ajax(FontsGoogleApis+encodeURIComponent(family),{method:'HEAD'})
            .then(resolve)
            .catch(reject)
        })
    }

    /**
     * Check if the font weight exists for the given family. Like `exists`, this
     * function makes a HEAD request. This function is under the same conditions
     * as `exists`. Consider it an updated version of that.
     * 
     * @param  {String}              family  The font family name.
     * @param  {String|Number|Array} weight  The number or string of the desired weight. Can be an array of strings.
     * @return {Promise} The promise of result.
     */
    function exists_weight_function(family, weight){
        var it = this
        var w = weight
        if (w instanceof Array)
            w = weight.join(',')
        var url = FontsGoogleApis+encodeURIComponent(family)+':'+w
        if (it.$loaded[family] && (it.$loaded[family].w.indexOf(weight) >= 0))
            return create_promise(function(resolve){ resolve(true) })
        return create_promise(function(resolve, reject){
            $.ajax(url,{method:'HEAD'})
            .then(resolve)
            .catch(reject)
        })
    }

    /**
     * Test if the array `target` has all the items of array `search` and return
     * the items that are not present in `target`. Returns an zero-length array
     * if all the items of `search` are present.
     * 
     * @param   {Array} target The target array to check whether all the items are present.
     * @param   {Array} search The array of checked items.
     * @returns {Array}        Returns missing items of target.
     */
    function ArrayHasItems(target,search){
        var v,insect=[]
        for(v of search)
            if(target.indexOf(v) < 0)
                insect.push(v)
        return insect
    }

    /**
     * Pushes items into the `arrayAsSet` array, but preventing duplicated values.
     * This function mimics the `add` function of a Set object. The function
     * does not return, but set the array itself.
     * 
     * @param {Array} arrayAsSet  The array that will receive new items.
     * @param {Array} added       The new items to append.
     */
    function ArraySetItems(arrayAsSet, added){
        for(var v of added)
            if(arrayAsSet.indexOf(v)<0)
                arrayAsSet.push(v)
    }

    /**
     * Entry method. This method of the library's main object allows to append
     * a new <link> with a new font family to the <head> section of the website.
     * If the font was previously loaded, it updates the link causing the browser
     * to reload the CSS with more information.
     *
     * @param  {String|Object} family  Family of font to load.
     *         The family loaded can be either a string with the family name to
     *         load, or an object with the following fields:
     *             - family (String): the family to laod.
     *             - weight (String|Number|Array): number or string with the font
     *                 weights to load from the Google Fonts server. It also can
     *                 be an array with the weights to load (e.g. [400, 900]). It
     *                 loads only the weight "400" if not provided.
     *             - subset (String|Array): the subset of characters to load from
     *                 the Google Fonts server. It can be a string or an array of
     *                 strings with multiple subsets. The subset "latin" is always
     *                 loaded. Example: ['latin-ext', 'greek']
     * @return {Promise} Promise to handle result of the operation.
     */
    function append_function(family){
        var it = this
        var familyname=family, subset=[]
        var weights = []
        if (typeof family !== 'string')
        {
            familyname = family.family
            weights = family.weight || []
            subset = family.subset || []
        }
        // `weights` and `subset` must be Array
        if (! (weights instanceof Array))
            weights = [weights]
        if (! (subset instanceof Array))
            subset = [subset]

        // Should we continue or it was already loaded before?
        var hasLoaded = !! it.$loaded[familyname]
        var hasWeights = hasLoaded && ! ArrayHasItems(it.$loaded[familyname].w, weights).length
        var hasSubset = hasLoaded && ! ArrayHasItems(it.$loaded[familyname].cs, subset).length
        if(hasLoaded && hasWeights && hasSubset)
            return create_promise(function(resolve){ resolve(true) })

        return create_promise(function(resolve, reject){
            var urifamily = encodeURIComponent(familyname)
            var uriweights = weights
            var uricharset = subset
            if(hasLoaded)
            {
                ArraySetItems(uriweights,it.$loaded[familyname].w)
                ArraySetItems(uricharset,it.$loaded[familyname].cs)
            }
            if((uriweights.length===1) && (Number(uriweights[0])==400))
                uriweights.pop()
            if(uricharset.length)
                ArraySetItems(uricharset, ['latin'])
            var url = FontsGoogleApis+urifamily
                +(uriweights.length?':'+uriweights.join(','):'')
                +(uricharset.length?'&subset='+uricharset.join(','):'')
            $.get(url)
            .then(function(...dontCare){
                // Update the fonts, weights and subset already loaded, append
                // or update the <link> element and resolve the Promise.
                var link = (hasLoaded && it.$loaded[familyname].link) || $('<link rel="stylesheet" type="text/css">')
                link.attr('href', url)
                $('head').append(link)
                it.$loaded[familyname] = it.$loaded[familyname] || {'w':[],'cs':['latin'],'link':null}
                if(! uriweights.length)
                    it.$loaded[familyname].w.push(400)
                ArraySetItems(it.$loaded[familyname].w, weights)
                subset.push('latin')
                ArraySetItems(it.$loaded[familyname].cs, subset)
                it.$loaded[familyname].link = link
                resolve(...dontCare)
            })
            .catch(reject)
        })
    }

    /**
     * Set the inline style attribute of the element with the given family and
     * weight. Additionally, it loads the font using the `append` function.
     * 
     * @param  {String|Object} element  Any value that jQuery can use as element.
     * @param  {String|Object} family   Font family or object like given to `append` function.
     * @param  {String}        fallback Font fallback, it can be: "sans-serif", "serif" or "monospace".
     * @return {Promise}                Promise to handle result of operation.
     */
    function stylize_function(element, family, fallback='sans-serif'){
        var cssfamily, cssweight
        var el = $(element)
        if(typeof family==='string'){
            cssfamily = family+','+fallback
            cssweight = 400
        } else
        {
            cssfamily = family.family+','+fallback
            if(family.weight instanceof Array)
                cssweight = (family.weight.length?family.weight[0]:'normal')
            else
                cssweight = family.weight
        }
        el.css('font-family', cssfamily)
        el.css('font-weight', cssweight)
        return this.append(family)
    }

    /**
     * Request to Google Fonts server to send a CSS including all the possible
     * weights of a font family. As it ignores the invalid weights, this function
     * parses it result and detect what are the valid sizes. The function has
     * the overhead of loading the entire CSS, but does not load the font files,
     * not append the <link> element or modify the website.
     * It returns an array with the valid font weights. It is useful when you need
     * to know which weights you can request for a given font.
     *
     * Important: this function rely on Google Fonts formatting, and its regular
     * expressions should be updated when there is some change. Don't worry! It
     * is only simple/easy regular expressions.
     * 
     * @param  {String} family  The font family as string.
     * @return {Array}          Array with the valid weights of the given family.
     */
    function info_function(family){
        var it = this
        var url = FontsGoogleApis+encodeURIComponent(family)+':100,200,300,400,500,600,700,800,900,100i,200i,300i,400i,500i,600i,700i,800i,900i'
        return create_promise(function(resolve, reject){
            $.get(url)
            .then(function(data, ...dontCare){
                if(data === true)
                    return resolve(null, data,...dontCare)
                var result = {'weight':{}, subset:{}}
                var css = String(data)
                var r,rgx
                //
                // This code captures the following format (example):
                //      font-style: normal;
                //      font-weight: 400;
                // In the example above, we set the weight 400 with the "normal"
                // field as "true".
                rgx = /font-style\s*:\s*normal;\s*font-weight\s*:\s*([^;}]+)/gi
                while(r=rgx.exec(css))
                    if(result.weight[r[1]])
                        result.weight[r[1]].normal=true
                    else
                        result.weight[r[1]]={normal:true,italic:false}
                //
                // Like code above, but captures the following format (example):
                //      font-style: italic;
                //      font-weight: 400;
                // In the example above, we set the weight 400 with the "italic"
                // field as "true".
                rgx = /font-style\s*:\s*italic;\s*font-weight\s*:\s*([^;}]+)/gi
                while(r=rgx.exec(css))
                    if(result.weight[r[1]])
                        result.weight[r[1]].italic=true
                    else
                        result.weight[r[1]]={normal:false,italic:true}
                //
                // Get the subsets that follows like (example):
                //      /* latin */
                // In the example above, we set the subset with the "latin"
                // field as "true"
                rgx = /\/\*\s*(\S+)\s*\*\//gi
                while(r=rgx.exec(css))
                    result.subset[r[1]] = true
                // We are done!
                resolve(result, data, ...dontCare)
            })
            .catch(reject)
        })
    }

    /**
     * This internal variable is, in fact, the true library's main object. It
     * will be given to the user with its methods.
     * @type {Object}
     * @private
     */
    var GFLoader = {
        '$loaded': {},
        'append': append_function,
        'exists': exists_function,
        'exists_weight': exists_weight_function,
        'info': info_function,
        'stylize': stylize_function,
    }

    /**
     * Finally, we set our amazing library on a public/global place, so users can
     * take advantage of our hard work (that took one afternoon to develop and
     * test for a single developer).
     */
    if(typeof window !== 'undefined')
        window.GFLoader = GFLoader
    return GFLoader
})()