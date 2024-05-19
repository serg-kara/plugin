(function() {
  'use strict';

  function _typeof(obj) {
    "@babel/helpers - typeof";

    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    }, _typeof(obj);
  }

  var host = 'https://bwa.to';
  var framework = 'https://4e5eaca0.bwa.pages.dev:8443';

  var hostcloud = ["http://bwa-cloud.cfhttp.top/online.js","http://bwa-cloud.cfhttp.top/sisi.js"];
  var hostcloud_version = '?v=090524';

  var plugins = ["o.js","s.js"];
  var plugins_version = '?v=150524';


  function putcloud() {
    Lampa.Utils.putScriptAsync(hostcloud.map(function(u) {
      return u + hostcloud_version;
    }), function() {});
  }
  
  if (Lampa.Platform.is('android') == false && Lampa.Platform.is('browser') == false) 
  {
    putcloud();
    return;
  }


  if (typeof WebAssembly == undefined) {
    putcloud();
  } else {
    Lampa.Utils.putScriptAsync(plugins.filter(function(u) {
      return (!window.bwajs_plugin && u == 'o.js') || (!window['plugin_sisi_pwa_ready'] && u == 's.js');
    }).map(function(u) {
      return host + '/plugins/' + u + plugins_version;
    }), function() {});
	
	if (window.blazor_load == undefined) {
		window.blazor_load = true;
		var s = document.createElement('script');
		s.onload = function() {
		  if (typeof Blazor == undefined) {
			console.log('BWA', 'Blazor undefined');
			return;
		  }

		  try {
			Blazor.start({
			  loadBootResource: function loadBootResource(type, name, defaultUri, integrity) {
				//console.log('BWA', 'load: ' + name);
				return framework + '/' + name;
			  }
			}).then(function() {
			  console.log('BWA', 'start complete');
			  var net = new Lampa.Reguest();
			  window.httpReq = function(url, post, params) {
				return new Promise(function(resolve, reject) {
				  net["native"](url, function(result) {
					if (_typeof(result) == 'object') resolve(JSON.stringify(result));
					else resolve(result);
				  }, reject, post, params);
				});
			  };

			  var check = function check(good) {
				try {
				  DotNet.invokeMethodAsync("JinEnergy", 'initial').then(function(initial) {
					if (initial) {
					  window.blazor_init = true;
					  console.log('BWA', 'check cors:', good);
					  var type = Lampa.Platform.is('android') ? 'apk' : good ? 'cors' : 'web';
					  var conf = host + '/settings/' + type + '.json';
					  DotNet.invokeMethodAsync("JinEnergy", 'oninit', type, conf);
					} else {
					  console.log('BWA', 'not initial');
					}
				  })["catch"](function(e) {
					console.log('BWA', e);
				  });
				} catch (e) {
				  console.log('BWA', e);
				}
			  };

			  if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) check(true);
			  else {
				net.silent('https://github.com/', function() {
				  check(true);
				}, function() {
				  check(false);
				}, false, {
				  dataType: 'text'
				});
			  }
			})["catch"](function(e) {
			  console.log('BWA', e);
			});
		  } catch (e) {
			console.log('BWA', e);
		  }
		};
	}
    s.setAttribute('autostart', 'false');
    s.setAttribute('src', framework + '/blazor.webassembly.js');
    document.body.appendChild(s);
  }
})();