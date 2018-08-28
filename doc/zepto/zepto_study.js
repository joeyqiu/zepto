var Zepto = (function() {

	var undefined,
			fragmentRE = /^\s*<(\w+|!)[^>]*>/,
			singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
			simpleSelectorRE = /^[\w-]*$/,
			readyRE = /complete|loaded|interactive/,
			zepto = {},
			elementDisplay = {},

			emptyArray = [],
			concat = emptyArray.concat,
			filter = emptyArray.filter,
			slice = emptyArray.slice,
			class2type = {},
			classCache = {},
			cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },

			table = document.createElement('table'),
    	tableRow = document.createElement('tr'),
			containers = {
	      'tr': document.createElement('tbody'),
	      'tbody': table,
	      'thead': table,
	      'tfoot': table,
	      'td': tableRow,
	      'th': tableRow,
	      '*': document.createElement('div')
	    },
	    isArray = Array.isArray || function(obj) {return obj instanceof Array};

	function type(obj) {
		return obj == null ? String(obj) : class2type[toString.call(obj)] || 'object';
	}

	function isFunction(value) { return type(value) == 'function' }
	function isWindow(obj) { return obj != null && obj == obj.window }
	function isDocument(obj) { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
	function isObject(obj) { return type(obj) == 'object' }

	function isPlainObject(obj) {
		return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype;
	}

	function likeArray(obj) {return typeof obj.length == 'number'}

	function flatten(array) {
		return array.length > 0 ? $.fn.concat.apply([], array) : array
	}

	/**
	 * 清理数组中为null的项
	 */
	function compact(array) {
		return filter.call(array, function(item){
			return item!=null
		});
	}

	/**
	 * 分隔符后面的首字母大写
	 * a-b 变成 aB
	 */
	function camelize(str) {
		return str.replace(/-+(.)?/g, function(match, chr) {
			return chr ? chr.toUpperCase() : ''
		});
	}

	/**
	 * 多个大写和小写之间的分隔
	 */
	function dasherize(str) {
		return str.replace(/::/g, '/').
			replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').
      replace(/([a-z\d])([A-Z])/g, '$1_$2').
      replace(/_/g, '-')
      toLowerCase()
	}

	/**
	 * 过滤数组中的重复项
	 * filter返回值为true的新数组
	 */
	function uniq(array) {
		return filter.call(array, function(item, index) {
			return array.indexOf(item) == index;
		})
	}

	/**
	 * \s 匹配一个空白符，包括空格、制表符、换页符、换行符和其他 Unicode 空格。
	 */
	function classRE(name) {
		return name in classCache ? classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
	}

	/**
	 * 传入的number，可能需要添加的是px值
	 */
	function maybeAddPx(name, value) {
		return (typeof value == 'number' && !cssNumber[dasherize(name)]) ? value+'px' : value
	}

	/**
	 * 传入node节点名称，获取默认的
	 * @param  {[type]} nodeName [description]
	 * @return {[type]}          [description]
	 */
	function defaultDisplay(nodeName) {
		var element, display;
		if (!elementDisplay[nodeName]) {
			element = document.createElement(nodeName);
			document.body.appendChild(element);
			display = getComputedStyle(element, '').getPropertyValue('display');
			element.parentNode.removeChild(element);
			display == 'none' && (display = 'block')
			elementDisplay[nodeName] = display;
		}
		return elementDisplay[nodeName];
	}

	function children(element) {
		return 'children' in element ?
			slice.call(element.children) :
			$.map(element.childNodes, function(node){if (node.nodeType==1) {return node}})
	}

	/**
	 * 把source的属性全部覆盖到target上
	 * 如果deep是true,且target上对应的属性不是对象或数组，直接覆盖
	 */
	function extend(target, source, deep) {
		var key;
		for (key in source) {
			if (deep && isPlainObject(source[key]) || isArray(source[key])) {
				if (isPlainObject(source[key]) && !isPlainObject(target[key])) {
					target[key] = {};
				}
				if (isArray(source[key]) && !isArray(target[key])) {
					target[key] =[]
				}
				extend(target[key], source[key], deep)
			} else if (source[key] !== undefined) {
				target[key] = source[key];
			}
		}
	}

	function filtered(nodes, selector) {
		return selector == null ? $(nodes) : $(nodes).filter(selector);
	}

	function setAttribute(node, name, value) {
		// value == ? node.removeAttribute(name) : node.setAttribute(name, value);
	}



	/**
	 * 可以说是一个Zepto对象的构造函数，除了通过数组的方式引用的节点外，就是length和selector属性了
	 */
	function Z(dom, selector) {
		var i, len=dom ? dom.length : 0;
		for (i=0; i<len;i++) {
			this[i] = dom[i];
		}
		this.length = len;
		this.selector = selector || '';
	}

	/**
	 *  返回一个Z对象
	 */
	zepto.Z = function(dom, selector) {
		return new Z(dom, selector);	
	}

	/**
	 * 判断是否已经是一个Z对象集合了
	 */
	zepto.isZ = function(object) {
		return object instanceof Z;
	}

	var methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'];
	/**
	 * 根据给定的一个html字符串和可选的tag标签，来生成DOM节点数组，并返回该数组
	 */
	zepto.fragment = function(html, name, properties) {
		var dom, nodes, container;

		// 传入一个dom节点字符串，创建该节点
		if (singleTagRE.test(html)) {
			dom = $(document.createElement(RegExp.$1));
		}

		if (!dom) {
			if (html.replace) {
				html = html.replace(singleTagRE, '<$1></$2>');
			}
			if (name == undefined) {
				name = fragmentRE.test(html) && RegExp.$1;
			}
			if (!(name in containers)) {
				name = '*';
			}

			container = containers[name];
			container.innerHTML = ''+html;
			dom = $.each(slice.call(container.childNodes), function() {
				container.removeChild(this);
			});
		}

		// 如果properties有值
		if (isPlainObject(properties)) {
			node = $(dom);
			$.each(properties, function(key, value) {
				if (methodAttributes.indexOf('key') > -1) {
					nodes[key](value);
				} else {
					nodes.attr(key, value);
				}
			})
		}

		return dom;
	}

	/**
	 * 如果element可以通过selector被选中，则返回true，否则返回false
	 */
	zepto.matches = function(element, selector) {
		// nodeType !== 1，表示不是元素节点
		if (!selector || !element || element.nodeType !== 1) return false;
		var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
													element.oMatchesSelector || element.msMatchesSelector || element.matchesSelector ||
													function(s) {
									           var matches = (this.document || this.ownerDocument).querySelectorAll(s),
									               i = matches.length;
									           while (--i >= 0 && matches.item(i) !== this) {}
									           return i > -1;            
									        };
		return matchesSelector.call(element, selector);
	};

	/**
	 * takes a css selector and an optional context (and handles various special cases)
	 * this method can be overridden in plugins
	 *
	 * 传入的selector类型： 空、字符串、function、zepto对象
	 */
	zepto.init = function(selector, context) {
		var dom;
		// nothing and return an empty Zepto collection
		if (!selector) {
			console.log('111');
			return zepto.Z();
		} else if (typeof selector == 'string') {
			console.log('222')
			/**
			 * 如果是字符串
			 * 1，先考虑是否是html标签
			 * 2，是否有上下文，在上下文中根据selector查找
			 * 3，把字符串当作CSS选择器去处理，通过querySelector
			 */
			selector = selector.trim();
			if (selector[0] == '<' && fragmentRE.test(selector)) {
				console.log(selector);
				console.log(RegExp.$1);
				dom = zepto.fragment(selector, RegExp.$1, context);
			} else if (context !== undefined) {
				// 如果有上下文context，在上下文中创建个collection，然后查找对应的节点
				return $(context).find(selector);
			} else {
				// 最后再不匹配就按照css选择器处理
				dom = zepto.qsa(document, selector);
			}
		} else if(isFunction(selector)) {
			console.log('333')
			return $(document).ready(selector);
		} else if (zepto.isZ(selector)) {
			console.log('444')
			return selector;
		} else {
			console.log('555')
			if (isArray(selector)) {
				// 如果传入的是node数组
				dom = compact(selector)
			} else if (isObject(selector)) {
				dom = [selector];
				selector = null;
			} else if (fragmentRE.test(selector)) {
				dom = zepto.fragmentRE(selector.trim(), RegExp.$1, context);
				selector = null;
			} else if (context !== undefined) {
				return $(context).find(selector);
			} else {
				console.log('555')
				dom = zepto.qsa(document, selector);
			}
		}

		return zepto.Z(dom, selector);
	}

	/**
   * 1.如果可以通过ID查找，则通过getElementByID查找
   * 2.如果不是元素或者document节点，documentFragment节点，返回空
   * 3. isSimple, 用getElementByClassName和getElementbyTagName试一下
   * 4. not simple, 用querySelectorAll试一下
   */
	zepto.qsa = function(element, selector) {
		var found,
				maybeID = selector[0] == '#',
				maybeClass = !maybeID && selector[0] == '.',
				nameOnly = maybeID || maybeClass ? selector.slice(1) : selector,
				isSimple = simpleSelectorRE.test(nameOnly);
		return (element.getElementById && isSimple && maybeID) ? 
			((found = element.getElementById(nameOnly)) ? [found] : []) :
			(element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
			slice.call(
				isSimple && !maybeID && element.getElementsByClassName ?
				maybeClass ? element.getElementsByClassName(nameOnly) :
				element.getElementsByTagName(selector) :
				element.querySelectorAll(selector))
	};
	
	$ = function(selector, context) {
		try {
			return zepto.init(selector, context);
		} catch(e) {
			console.log(e);
		}
		return null;
	}

	$.type = type;
	$.isFunction = isFunction;
	$.isWindow = isWindow;
	$.isArray = isArray;
	$.isPlainObject = isPlainObject;

	/**
	 * 检查是否是空对象
	 */
	$.isEmptyObject = function(obj) {
		var name
		for (name in obj) {
			return false;
		}
		return true;
	}

	/**
	 * 查找在array中的位置，i 表示从什么位置开始查找
	 */
	$.inArray = function(elem, array, i) {
		return emptyArray.indexOf.call(array, elem, i);
	}

	/**
	 * 遍历多个对象去继承，deep传在第一个参数，target是第二个
	 */
	$.extend = function(target) {
		var deep, args = slice.call(arguments, 1);
		if (type(target) == 'boolean') {
			deep = target;
			target = args.shift();
		}
		args.forEach(function(arg){ extend(target, arg, deep) })
		return target;
	}

	$.camelCase = camelize;
	$.trim = function(str) {
		return str == null ? '' : String.prototype.trim.call(str);
	}

	$.grep = function(elements, callback) {
		return filter.call(elements, callback);
	}

	if (window.JSON) {
		$.parseJSON = JSON.parse
	}

	/**
	 * 遍历数组或对象，最终返回该数组或对象，遍历只是进行每个元素的callback操作
	 * 
	 * 并对每个对象执行callback，如果callback返回false，则跳过后续遍历，直接返回该数组
	 */
	$.each = function(elements, callback) {
		var i,key;
		if (likeArray(elements)) {
			for (i =0, len=elements.length; i < len; i++) {
				if (callback.call(elements[i], i, elements[i]) === false) {
					return elements;
				}
			}
		} else {
			for (key in elements) {
				if (callback.call(elements[key], key, elements[key]) === false) {
					return elements;
				}
			}
		}
		return elements;
	}

	$.contains = document.documentElement.contains ?
		function(parent, node) {
			return parent !== node && parent.contains(node)
		} :
		function(parent, node) {
			while(node && (node = node.parentNode)) {
				if (node === parent) return true
			}
			return false;
		}

	/**
	 * 遍历赋值类型对象
	 */
	$.each("Boolean Number String Function Array Date RegExp Object Error".split(' '), function(i, name) {
		class2type['[object '+name+']'] = name.toLowerCase();
	});

	/**
	 * 遍历数组或对象，并对其中的每一项进行修改，返回!=null的部分，转为数组
	 * 返回这样修改后的数组
	 */
	$.map = function(elements, callback) {
		var value, values= [], i,key;
		if (likeArray(elements)) {
			for (i=0;i<elements.length;i++){
				value = callback(elements[i], i);
				if (value != null) values.push(value)
			}
		} else {
			for (key in elements) {
				value = callback(elements[key], key);
				if (value != null) values.push(value)
			}
		}
		return flatten(values);
	}

	/**
	 * 所有zepto对象上可用的方法属性集合
	 */
	$.fn = {
		constructor: zepto.Z,
		length: 0,

		// 因为集合类似数组，所有拷贝一些常用数组方法
		forEach: emptyArray.forEach,
		reduce: emptyArray.reduce,
		push: emptyArray.push,
		sort: emptyArray.sort,
		splice: emptyArray.splice,
		indexOf: emptyArray.indexOf,

		concat: function() {
			var i, value, args = [];
			for (i=0,len=arguments.length; i < len; i++) {
				value = arguments[i];
				args[i] = zepto.isZ(value) ? value.toArray() : value
			}
			return concat.apply(zepto.isZ(this) ? this.toArray() : this, args);
		},

		get: function(idx) {
			return idx == undefined ? slice.call(this) : this[idx > 0 ? idx : idx + this.length]
		},

		toArray: function() {
			return this.get();
		},

		concat: function() {
			var i,value,args=[];
			for (i=0; i< arguments.length; i++) {
				values = arguments[i];
				args[i] = zepto.isZ(value) ? value.toArray():value
			}
			return concat.apply(zepto.isZ(this) ? this.toArray() : this, args);
		},

		map: function(fn) {
			return $($.map(this, function(el,i){
				return fn.call(el, i ,el);
			}))
		},

		slice: function() {
			return $(slice.apply(this, arguments));
		},

		get: function(idx) {
			return idx === undefined ? slice.call(this) : this[idx >=0 ? idx : idx+this.length]
		},

		toArray: function() {
			return this.get()
		},

		size: function() { return this.length },

		remove: function(callback) {
			return this.each(function() {
				if (this.parentNode) {
					this.parentNode.removeChild(this);
				}
			})
		},

		each: function(callback) {
			emptyArray.every.call(this, function(el, idx) {
				return callback.call(el, idx, el) !== false
			});
			return this;
		},

		/**
		 * 查找
		 */
		find: function(selector) {
			var result, $this = this;
			if (!selector) {
				result = $();
			} else if (typeof selector == 'object') {
				result = $(selector).filter(function() {
					var node = this;
					return emptyArray.some.call($this, function(parent) {
						return $.contains(parent, node);
					})
				})
			} else if (this.length ==1) {
				result = $(zepto.qsa(this[0], selector));
			} else {
				result = this.map(function(){
					return zepto.qsa(this, selector);
				})
			}

			return result;
		},

		filter: function(selector) {
			if (isFunction(selector)) {
				return this.not(this.not(selector));
			}
			return $(filter.call(this, function(element) {
				return zepto.matches(element, selector);
			}));
		},

		add: function(selector, context) {
			return $(uniq(this.concat($(selector, context))));
		},

		is: function(selector) {
			return this.length > 0 && zepto.matches(this[0], selector)
		},

		not: function(selector) {
			var nodes = [];
			if (isFunction(selector) && selector.call !== undefined) {
				this.each(function(idx) {
					if (!selector.call(this, idx)) nodes.push(this)
				})
			} else {
				var excludes = typeof selector == 'string' ? this.filter(selector) :
					(likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector);
				this.forEach(function(el) {
					if (excludes.indexOf(el) < 0) nodes.push(el)
				})
			}
			return $(nodes)
		},

		ready: function(callback) {
			// for IE, 检查document.body是否存在
			if (readyRE.test(document.readyState) && document.body) callback($);
			else document.addEventListener('DOMContentLoaded', function(){callback($)}, false)
			return this;
		},

		has: function(selector) {
			return this.filter(function() {
				return isObject(selector) ? $.contains(this, selector) : $(this).find(selector).size()
			});
		},

		eq: function(idx) {
			return idx == -1 ? this.slice(idx) : this.slice(idx, idx+1);
		},

		first: function() {
			var el = this[0];
			return el && !isObject(el) ? el : $(el);
		},

		last: function() {
			var el = this[this.length -1];
			return el && !isObject(el) ? el : $(el);
		},

		parent: function(selector) {
			return filtered(uniq(this.pluck('parentNode')), selector);
		},
		closet: function(selector, context) {
			var node = this[0],
					collection = false;
			if (typeof selector == 'object') {
				collection = $(selector);
			}
			while(node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector))) {
				node = node !== context && !isDocument(node) && node.parentNode
			}
			return $(node);
		}
	}


	zepto.Z.prototype = Z.prototype = $.fn;

	$.zepto = zepto;
	return $;
})();

window.Zepto = Zepto;
window.$ === undefined && (window.$ = Zepto);