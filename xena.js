(function() {
  'use strict';

  var Defined = {
    use_api: 'xsena',
    localhost: 'https://api.xsena.red/sisi',
    framework: ''
  };

  var luid = Lampa.Storage.get('lampac_unic_id', '');
  if (!luid) {
    luid = Lampa.Utils.uid(8).toLowerCase();
    Lampa.Storage.set('lampac_unic_id', luid);
  }

  Lampa.Lang.add({
    lampac_sisiname: {
      ru: 'Клубничка',
      en: 'Strawberry',
      uk: 'Полуничка',
      zh: '草莓'
    }
  });

  var network = new Lampa.Reguest();
  var preview_timer, preview_video;

  function sourceTitle(title) {
    return Lampa.Utils.capitalizeFirstLetter(title.split('.')[0]);
  }

  function isVIP(element) {
    return /vip.mp4/.test(element.video);
  }

    function getAndroidVersion() {
  if (Lampa.Platform.is('android')) {
    try {
      var current = AndroidJS.appVersion().split('-');
      return parseInt(current.pop());
    } catch (e) {
      return 0;
    }
  } else {
    return 0;
  }
}

var hostkey = 'https://api.xsena.red'.replace('http://', '').replace('https://', '');

if (!window.rch_nws || !window.rch_nws[hostkey]) {
  if (!window.rch_nws) window.rch_nws = {};

  window.rch_nws[hostkey] = {
    type: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : undefined,
    startTypeInvoke: false,
    rchRegistry: false,
    apkVersion: getAndroidVersion()
  };
}

window.rch_nws[hostkey].typeInvoke = function rchtypeInvoke(host, call) {
  if (!window.rch_nws[hostkey].startTypeInvoke) {
    window.rch_nws[hostkey].startTypeInvoke = true;

    var check = function check(good) {
      window.rch_nws[hostkey].type = Lampa.Platform.is('android') ? 'apk' : good ? 'cors' : 'web';
      call();
    };

    if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) check(true);
    else {
      var net = new Lampa.Reguest();
      net.silent('https://api.xsena.red'.indexOf(location.host) >= 0 ? 'https://github.com/' : host + '/cors/check', function() {
        check(true);
      }, function() {
        check(false);
      }, false, {
        dataType: 'text'
      });
    }
  } else call();
};

window.rch_nws[hostkey].Registry = function RchRegistry(client, startConnection) {
  window.rch_nws[hostkey].typeInvoke('https://api.xsena.red', function() {

    client.invoke("RchRegistry", JSON.stringify({
      version: 149,
      host: location.host,
      rchtype: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : (window.rch_nws[hostkey].type || 'web'),
      apkVersion: window.rch_nws[hostkey].apkVersion,
      player: Lampa.Storage.field('player'),
	  account_email: Lampa.Storage.get('account_email', ''),
	  unic_id: Lampa.Storage.get('lampac_unic_id', ''),
	  profile_id: Lampa.Storage.get('lampac_profile_id', ''),
	  token: ''
    }));

    if (client._shouldReconnect && window.rch_nws[hostkey].rchRegistry) {
      if (startConnection) startConnection();
      return;
    }

    window.rch_nws[hostkey].rchRegistry = true;

    client.on('RchRegistry', function(clientIp) {
      if (startConnection) startConnection();
    });

    client.on("RchClient", function(rchId, url, data, headers, returnHeaders) {
      var network = new Lampa.Reguest();

      function result(html) {
        if (Lampa.Arrays.isObject(html) || Lampa.Arrays.isArray(html)) {
          html = JSON.stringify(html);
        }

        if (typeof CompressionStream !== 'undefined' && html && html.length > 1000) {
          var compressionStream = new CompressionStream('gzip');
          var encoder = new TextEncoder();
          var readable = new ReadableStream({
            start: function(controller) {
              controller.enqueue(encoder.encode(html));
              controller.close();
            }
          });
          var compressedStream = readable.pipeThrough(compressionStream);
          new Response(compressedStream).arrayBuffer()
            .then(function(compressedBuffer) {
              var compressedArray = new Uint8Array(compressedBuffer);
              if (compressedArray.length > html.length) {
                client.invoke("RchResult", rchId, html);
              } else {
                $.ajax({
                  url: 'https://api.xsena.red/rch/gzresult?id=' + rchId,
                  type: 'POST',
                  data: compressedArray,
                  async: true,
                  cache: false,
                  contentType: false,
                  processData: false,
                  success: function(j) {},
                  error: function() {
                    client.invoke("RchResult", rchId, html);
                  }
                });
              }
            })
            .catch(function() {
              client.invoke("RchResult", rchId, html);
            });

        } else {
          client.invoke("RchResult", rchId, html);
        }
      }

      if (url == 'eval') {
        console.log('RCH', url, data);
        result(eval(data));
      } else if (url == 'evalrun') {
        console.log('RCH', url, data);
        eval(data);
      } else if (url == 'ping') {
        result('pong');
      } else {
        console.log('RCH', url);
        network["native"](url, result, function(e) {
          console.log('RCH', 'result empty, ' + e.status);
          result('');
        }, data, {
          dataType: 'text',
          timeout: 1000 * 8,
          headers: headers,
          returnHeaders: returnHeaders
        });
      }
    });

    client.on('Connected', function(connectionId) {
      console.log('RCH', 'ConnectionId: ' + connectionId);
      window.rch_nws[hostkey].connectionId = connectionId;
    });
    client.on('Closed', function() {
      console.log('RCH', 'Connection closed');
    });
    client.on('Error', function(err) {
      console.log('RCH', 'error:', err);
    });
  });
};
  window.rch_nws[hostkey].typeInvoke('https://api.xsena.red', function() {});

  function rchInvoke(json, call) {
    if (window.nwsClient && window.nwsClient[hostkey] && window.nwsClient[hostkey]._shouldReconnect){
      call();
      return;
    }
    if (!window.nwsClient) window.nwsClient = {};
    if (window.nwsClient[hostkey] && window.nwsClient[hostkey].socket)
      window.nwsClient[hostkey].socket.close();
    window.nwsClient[hostkey] = new NativeWsClient(json.nws, {
      autoReconnect: false
    });
    window.nwsClient[hostkey].on('Connected', function(connectionId) {
      window.rch_nws[hostkey].Registry(window.nwsClient[hostkey], function() {
        call();
      });
    });
    window.nwsClient[hostkey].connect();
  }

  function rchRun(json, call) {
    if (typeof NativeWsClient == 'undefined') {
      Lampa.Utils.putScript(["https://api.xsena.red/js/nws-client-es5.js?v18112025"], function() {}, false, function() {
        rchInvoke(json, call);
      }, true);
    } else {
      rchInvoke(json, call);
    }
  }

  function modal(text) {
    var id = Lampa.Storage.get('sisi_unic_id', '').toLowerCase();
    var controller = Lampa.Controller.enabled().name;
    var content = "<div class=\"about\">\n<div>"+(text||'Добавьте идентификатор устройства в init.conf')+"</div>\n<div class=\"about__contacts\">\n<div>\n<small>unic_id</small><br>\n"+luid+"\n</div>\n\n<div>\n<small>box_mac</small><br>\n"+id+"\n</div>\n</div>\n</div>";
	// "<div class=\"about\">\n<div>\u042D\u0442\u043E \u0432\u0438\u0434\u0435\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0441 VIP \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u043E\u0439. \u0414\u043B\u044F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F VIP \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438, \u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0430\u0439\u0442 \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0443\u043A\u0430\u0437\u0430\u043D \u043D\u0438\u0436\u0435 \u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0432\u0430\u0448 ID</div>\n<div class=\"about__contacts\">\n<div>\n                <small>\u0421\u0430\u0439\u0442</small><br>\n{vip_site}\n</div>\n\n<div>\n<small>\u0412\u0430\u0448 ID</small><br>\n".concat(id, "\n</div>\n</div>\n</div>");
    Lampa.Modal.open({
      title: 'Доступ ограничен',
      html: $(content),
      size: 'medium', // small|medium
      onBack: function onBack() {
        Lampa.Modal.close();
        Lampa.Controller.toggle(controller);
      }
    });
  }

  function qualityDefault(qualitys) {
    var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
    var url;

    if (qualitys) {
      for (var q in qualitys) {
        if (q.indexOf(preferably) == 0) url = qualitys[q];
      }

      if (!url) url = qualitys[Lampa.Arrays.getKeys(qualitys)[0]];
    }

    return url;
  }

  function play(element) {
    var controller_enabled = Lampa.Controller.enabled().name;

    if (isVIP(element)) {
      return modal();
    }
	
    if (true && !element.history_uid && element.bookmark && Lampa.Storage.field('sisi_history')) {
      network.silent(Api.account(Defined.localhost + '/history/add'), function(e) {}, function() {}, JSON.stringify(element), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (element.json) {
      Lampa.Loading.start(function() {
        network.clear();
        Lampa.Loading.stop();
      });
      Api.account(element.video + '&json=true');
      Api.qualitys(element.video, function(data) {
        if (data.error) {
          Lampa.Noty.show(Lampa.Lang.translate('torrent_parser_nofiles'));
          Lampa.Loading.stop();
          return;
        }

        var qualitys = data.qualitys || data;
        var recomends = data.recomends || [];
        Lampa.Loading.stop();

        for (var i in qualitys) {
          qualitys[i] = Api.account(qualitys[i], true);
        }

        var video = {
          title: element.name,
          url: Api.account(qualityDefault(qualitys), true),
          url_reserve: data.qualitys_proxy ? Api.account(qualityDefault(data.qualitys_proxy), true) : false,
          quality: qualitys,
		  headers: data.headers_stream
        };
        Lampa.Player.play(video);

        if (recomends.length) {
          recomends.forEach(function(a) {
            a.title = Lampa.Utils.shortText(a.name, 50);
            a.icon = '<img class="size-youtube" src="' + a.picture + '" />';
            a.template = 'selectbox_icon';

            a.url = function(call) {
              if (a.json) {
                Api.qualitys(a.video, function(data) {
                  a.quality = data.qualitys;
                  a.url = Api.account(qualityDefault(data.qualitys), true);
                  if (data.qualitys_proxy) a.url_reserve = Api.account(qualityDefault(data.qualitys_proxy), true);
                  call();
                });
              } else {
                a.url = a.video;
                call();
              }
            };
          });
          Lampa.Player.playlist(recomends);
        } else {
          Lampa.Player.playlist([video]);
        }

        Lampa.Player.callback(function() {
          Lampa.Controller.toggle(controller_enabled);
        });
      }, function() {
        Lampa.Noty.show(Lampa.Lang.translate('torrent_parser_nofiles'));
        Lampa.Loading.stop();
      });
    } else {
      if (element.qualitys) {
        for (var i in element.qualitys) {
          element.qualitys[i] = Api.account(element.qualitys[i], true);
        }
      }

      var video = {
        title: element.name,
        url: Api.account(qualityDefault(element.qualitys) || element.video, true),
        url_reserve: Api.account(qualityDefault(element.qualitys_proxy) || element.video_reserve || '', true),
        quality: element.qualitys
      };
      Lampa.Player.play(video);
      Lampa.Player.playlist([video]);
      Lampa.Player.callback(function() {
        Lampa.Controller.toggle(controller_enabled);
      });
    }
  }

  function fixCards(json) {
    json.forEach(function(m) {
      m.background_image = m.picture;
      m.poster = m.picture;
      m.img = m.picture;
      m.name = Lampa.Utils.capitalizeFirstLetter(m.name).replace(/\&(.*?);/g, '');
    });
  }

  function hidePreview() {
    clearTimeout(preview_timer);

    if (preview_video) {
      var vid = preview_video.find('video')
			  
	  var pausePromise;

		try{
			pausePromise = vid.pause()
		}
		catch(e){ }

		if (pausePromise !== undefined) {
			pausePromise.then(function(){
				
			})
			.catch(function(e){
				
			});
		}
      preview_video.addClass('hide');
      preview_video = false;
    }
  }

  function preview(target, element) {
    hidePreview();
    preview_timer = setTimeout(function() {
      if (!element.preview || !Lampa.Storage.field('sisi_preview')) return;
      var video = target.find('video');
      var container = target.find('.sisi-video-preview');

      if (!video) {
        video = document.createElement('video');
        container = document.createElement('div');
        container.addClass('sisi-video-preview');
        container.style.position = 'absolute';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.left = '0';
        container.style.top = '0';
        container.style.overflow = 'hidden';
        container.style.borderRadius = '1em';
        video.style.position = 'absolute';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.left = '0';
        video.style.top = '0';
        video.style.objectFit = 'cover';
        container.append(video);
        target.find('.card__view').append(container);
        video.src = element.preview; // 'https://thumb-v4.xhcdn.com/a/og0z25CtaTIZXgzkV7qJ8Q/023/463/094/526x298.44.t.webm'
		video.addEventListener('ended', function() {
			container.addClass('hide')
		})
        video.load();
      }

      preview_video = container;
	  
	  var playPromise;

		try{
			playPromise = video.play()
		}
		catch(e){ }


		if (playPromise !== undefined) {
			playPromise.then(function(){
				
			})
			.catch(function(e){
				
			});
		}

      container.removeClass('hide');
    }, 1500);
  }

  function fixList(list) {
    list.forEach(function(a) {
      if (!a.quality && a.time) a.quality = a.time;
    });
    return list;
  }

  function menu$2(target, card_data) {
    if (!card_data.bookmark) return;
    var cm = [{
      title: !card_data.bookmark.uid ? 'В закладки' : 'Удалить из закладок'
    }];

    if (card_data.history_uid) {
      cm.push({
        title: 'Удалить из истории',
        history: true
      });
    }

    if (card_data.related) {
      cm.push({
        title: 'Похожие',
        related: true
      });
    }

    if (card_data.model) {
      cm.push({
        title: card_data.model.name,
        model: true
      });
    }
	
    if (Lampa.Platform.is('android') && Lampa.Storage.field('player') !== 'inner') {
      cm.push({
        title: 'Плеер Lampa',
        lampaplayer: true
      });
    }

    Lampa.Select.show({
      title: 'Меню',
      items: cm,
      onSelect: function onSelect(m) {
        if (m.model) {
          Lampa.Activity.push({
            url: Defined.localhost.replace('/sisi', '') + '/' + card_data.model.uri,
            title: 'Модель - ' + card_data.model.name,
            component: 'sisi_view_' + Defined.use_api,
            page: 1
          });
        } else if (m.related) {
          Lampa.Activity.push({
            url: card_data.video + '&related=true',
            title: 'Похожие - ' + card_data.title,
            component: 'sisi_view_' + Defined.use_api,
            page: 1
          });
        } else if (m.history) {
          Api.history(card_data, function(status) {
            Lampa.Noty.show('Успешно');
          });
          Lampa.Controller.toggle('content');
        } else if (m.lampaplayer) {
          Lampa.Controller.toggle('content');
          play(card_data);
        } else {
          Api.bookmark(card_data, !card_data.bookmark.uid, function(status) {
            Lampa.Noty.show('Успешно');
          });
          Lampa.Controller.toggle('content');
        }
      },
      onBack: function onBack() {
        Lampa.Controller.toggle('content');
      }
    });
  }

  var Utils = {
    sourceTitle: sourceTitle,
    play: play,
    fixCards: fixCards,
    isVIP: isVIP,
    preview: preview,
    hidePreview: hidePreview,
    fixList: fixList,
    menu: menu$2
  };

  var menu$1;

  function ApiPWA() {
    var _this = this;

    var network = new Lampa.Reguest();

    this.menu = function(success, error) {
      if (menu$1) return success(menu$1);
      DotNet.invokeMethodAsync("JinEnergy", 'sisi', '').then(function(data) {
        if (data) {
          menu$1 = data;
          success(menu$1);
        } else {
          error(data.msg);
        }
      })["catch"](function() {
        console.log('Sisi', 'no load menu');
        error();
      });
    };

    this.view = function(params, success, error) {
      var u = this.account(Lampa.Utils.addUrlComponent(params.url, 'pg=' + (params.page || 1)));
      DotNet.invokeMethodAsync("JinEnergy", u.path, u.query).then(function(json) {
        if (json.list) {
          json.results = Utils.fixList(json.list);
          json.collection = true;
          json.total_pages = json.total_pages || 30;
          Utils.fixCards(json.results);
          delete json.list;
          success(json);
        } else {
          error();
        }
      })["catch"](function() {
        console.log('Sisi', 'no load', u.path + '+' + u.query);
        error();
      });
    };

    this.bookmark = function(element, add, call) {
      call(true);
    };

    this.account = function(u, join) {
      if (join) {
        if (Defined.use_api == 'lampac' && u.indexOf(Defined.localhost.replace('/sisi', '')) == -1) return u;
      }

      var unic_id = Lampa.Storage.get('sisi_unic_id', '');
      var uid = Lampa.Storage.get('lampac_unic_id', '');
      var email = Lampa.Storage.get('account', {}).email;

      if (u.indexOf('box_mac=') == -1) u = Lampa.Utils.addUrlComponent(u, 'box_mac=' + unic_id);

      if (email) {
        if (u.indexOf('account_email=') == -1) u = Lampa.Utils.addUrlComponent(u, 'account_email=' + encodeURIComponent(email));
      }

      if (uid) {
        if (u.indexOf('uid=') == -1) u = Lampa.Utils.addUrlComponent(u, 'uid=' + encodeURIComponent(uid));
      }

      if (u.indexOf('token=') == -1) {
        var token = '';
        if (token != '') u = Lampa.Utils.addUrlComponent(u, 'token=');
      }

      if (join) return u;
      return {
        path: u.split('?')[0],
        query: u.split('?')[1]
      };
    };

    this.playlist = function(add_url_query, oncomplite, error) {
      var load = function load() {
        var status = new Lampa.Status(menu$1.length);

        status.onComplite = function(data) {
          var items = [];
          menu$1.forEach(function(m) {
            if (data[m.playlist_url] && data[m.playlist_url].results.length) items.push(data[m.playlist_url]);
          });
          if (items.length) oncomplite(items);
          else error();
        };

        menu$1.forEach(function(m, i) {
          var separator = m.playlist_url.indexOf('?') !== -1 ? '&' : '?';
          var url_query = add_url_query.indexOf('?') !== -1 || add_url_query.indexOf('&') !== -1 ? add_url_query.substring(1) : add_url_query;
          var u = _this.account(m.playlist_url + separator + url_query);

          var b = false;
          var w = setTimeout(function() {
            b = true;
            status.error();
          }, 1000 * 8);
          DotNet.invokeMethodAsync("JinEnergy", u.path, u.query).then(function(json) {
            clearTimeout(w);
            if (b) return;

            if (json.list) {
              json.title = Utils.sourceTitle(m.title);
              json.results = Utils.fixList(json.list);
              json.url = m.playlist_url;
              json.collection = true;
              json.line_type = 'none';
  