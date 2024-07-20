(function () {
    'use strict';

    var Defined = {
      use_api: 'lampac',
      localhost: 'http://bwa-cloud.cfhttp.top/sisi',
      vip_site: '',
      framework: ''
    };

    var network = new Lampa.Reguest();
    var preview_timer, preview_video;

    function sourceTitle(title) {
      return Lampa.Utils.capitalizeFirstLetter(title.split('.')[0]);
    }

    function isVIP(element) {
      return /vip.mp4/.test(element.video);
    }

    function modal() {
      var id = Lampa.Storage.get('sisi_unic_id', '').toLowerCase();
      var controller = Lampa.Controller.enabled().name;
      var content = "<div class=\"about\">\n        <div>\u042D\u0442\u043E \u0432\u0438\u0434\u0435\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0441 VIP \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u043E\u0439. \u0414\u043B\u044F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F VIP \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438, \u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0430\u0439\u0442 \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0443\u043A\u0430\u0437\u0430\u043D \u043D\u0438\u0436\u0435 \u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0432\u0430\u0448 ID</div>\n        <div class=\"about__contacts\">\n            <div>\n                <small>\u0421\u0430\u0439\u0442</small><br>\n                ".concat(Defined.vip_site, "\n            </div>\n\n            <div>\n                <small>\u0412\u0430\u0448 ID</small><br>\n                ").concat(id, "\n            </div>\n        </div>\n    </div>");
      Lampa.Modal.open({
        title: 'VIP Контент',
        html: $(content),
        size: 'medium',
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

      if (element.json) {
        Lampa.Loading.start(function () {
          network.clear();
          Lampa.Loading.stop();
        });
        Api.account(element.video + '&json=true');
        Api.qualitys(element.video, function (data) {
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
            quality: qualitys
          };
          Lampa.Player.play(video);

          if (recomends.length) {
            recomends.forEach(function (a) {
              a.title = Lampa.Utils.shortText(a.name, 50);
              a.icon = '<img class="size-youtube" src="' + a.picture + '" />';
              a.template = 'selectbox_icon';

              a.url = function (call) {
                if (a.json) {
                  Api.qualitys(a.video, function (data) {
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

          Lampa.Player.callback(function () {
            Lampa.Controller.toggle(controller_enabled);
          });
        }, function () {
          Lampa.Noty.show(Lampa.Lang.translate('torrent_parser_nofiles'));
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
        Lampa.Player.callback(function () {
          Lampa.Controller.toggle(controller_enabled);
        });
      }
    }

    function fixCards(json) {
      json.forEach(function (m) {
        m.background_image = m.picture;
        m.poster = m.picture;
        m.img = m.picture;
        m.name = Lampa.Utils.capitalizeFirstLetter(m.name).replace(/\&(.*?);/g, '');
      });
    }

    function hidePreview() {
      clearTimeout(preview_timer);

      if (preview_video) {
        preview_video.find('video').pause();
        preview_video.addClass('hide');
        preview_video = false;
      }
    }

    function preview(target, element) {
      hidePreview();
      preview_timer = setTimeout(function () {
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

          video.load();
        }

        preview_video = container;
        video.play();
        container.removeClass('hide');
      }, 1500);
    }

    function fixList(list) {
      list.forEach(function (a) {
        if (!a.quality && a.time) a.quality = a.time;
      });
      return list;
    }

    function menu$2(target, card_data) {
      if (!card_data.bookmark) return;
      var cm = [{
        title: !card_data.bookmark.uid ? 'В закладки' : 'Удалить из закладок'
      }];

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
          } else {
            Api.bookmark(card_data, !card_data.bookmark.uid, function (status) {
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

      this.menu = function (success, error) {
        if (menu$1) return success(menu$1);
        DotNet.invokeMethodAsync("JinEnergy", 'sisi', '').then(function (data) {
          if (data) {
            menu$1 = data;
            success(menu$1);
          } else {
            error(data.msg);
          }
        })["catch"](function () {
          console.log('Sisi', 'no load menu');
          error();
        });
      };

      this.view = function (params, success, error) {
        var u = this.account(Lampa.Utils.addUrlComponent(params.url, 'pg=' + (params.page || 1)));
        DotNet.invokeMethodAsync("JinEnergy", u.path, u.query).then(function (json) {
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
        })["catch"](function () {
          console.log('Sisi', 'no load', u.path + '+' + u.query);
          error();
        });
      };

      this.bookmark = function (element, add, call) {
        call(true);
      };

      this.account = function (u, join) {
        if (join) {
          if (Defined.use_api == 'lampac' && u.indexOf(Defined.localhost.replace('/sisi', '')) == -1) return u;
        }

        var unic_id = Lampa.Storage.get('sisi_unic_id', '');
        var email = Lampa.Storage.get('account', {}).email;
        if (u.indexOf('box_mac=') == -1) u = Lampa.Utils.addUrlComponent(u, 'box_mac=' + unic_id);else u = u.replace(/box_mac=[^&]+/, 'box_mac=' + unic_id);

        if (email) {
          if (u.indexOf('account_email=') == -1) u = Lampa.Utils.addUrlComponent(u, 'account_email=' + encodeURIComponent(email));else u = u.replace(/account_email=[^&]+/, 'account_email=' + encodeURIComponent(email));
        }

        if (join) return u;
        return {
          path: u.split('?')[0],
          query: u.split('?')[1]
        };
      };

      this.playlist = function (add_url_query, oncomplite, error) {
        var load = function load() {
          var status = new Lampa.Status(menu$1.length);

          status.onComplite = function (data) {
            var items = [];
            menu$1.forEach(function (m) {
              if (data[m.playlist_url] && data[m.playlist_url].results.length) items.push(data[m.playlist_url]);
            });
            if (items.length) oncomplite(items);else error();
          };

          menu$1.forEach(function (m, i) {
            var u = _this.account(m.playlist_url + add_url_query);

            var b = false;
            var w = setTimeout(function () {
              b = true;
              status.error();
            }, 1000 * 8);
            DotNet.invokeMethodAsync("JinEnergy", u.path, u.query).then(function (json) {
              clearTimeout(w);
              if (b) return;

              if (json.list) {
                json.title = Utils.sourceTitle(m.title);
                json.results = Utils.fixList(json.list);
                json.url = m.playlist_url;
                json.collection = true;
                json.line_type = 'none';
                json.card_events = {
                  onMenu: Utils.menu,
                  onEnter: function onEnter(card, element) {
                    Utils.hidePreview();
                    Utils.play(element);
                  }
                };
                Utils.fixCards(json.results);
                delete json.list;
                status.append(m.playlist_url, json);
              } else {
                status.error();
              }
            })["catch"](function () {
              console.log('Sisi', 'no load', u.path + '+' + u.query);
              clearTimeout(w);
              status.error();
            });
          });
        };

        if (menu$1) load();else {
          _this.menu(load, error);
        }
      };

      this.main = function (params, oncomplite, error) {
        this.playlist('', oncomplite, error);
      };

      this.search = function (params, oncomplite, error) {
        this.playlist('?search=' + encodeURIComponent(params.query), oncomplite, error);
      };

      this.qualitys = function (video_url, oncomplite, error) {
        var u = this.account(video_url + '&json=true');
        DotNet.invokeMethodAsync("JinEnergy", u.path, u.query).then(oncomplite)["catch"](function (e) {
          console.log('Sisi', 'no load', u.path + '+' + u.query);
          error();
        });
      };

      this.clear = function () {
        network.clear();
      };
    }

    var ApiPWA$1 = new ApiPWA();

    var menu;

    function ApiHttp() {
      var _this = this;

      var network = new Lampa.Reguest();

      this.menu = function (success, error) {
        if (menu) return success(menu);
        network.silent(this.account(Defined.localhost), function (data) {
          if (data.channels) {
            menu = data.channels;
            success(menu);
          } else {
            error(data.msg);
          }
        }, error);
      };

      this.view = function (params, success, error) {
        var u = Lampa.Utils.addUrlComponent(params.url, 'pg=' + (params.page || 1));
        network.silent(this.account(u), function (json) {
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
        }, error);
      };

      this.bookmark = function (element, add, call) {
        var u = Defined.localhost + '/bookmark/' + (add ? 'add' : 'remove?uid=' + element.bookmark.uid);
        network.silent(this.account(u), function (e) {
          call(true);
        }, function () {
          call(false);
        }, JSON.stringify(element), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      };

      this.account = function (u) {
        if (Defined.use_api == 'lampac' && u.indexOf(Defined.localhost.replace('/sisi', '')) == -1 && window.location.hostname !== 'localhost') return u;
        var unic_id = Lampa.Storage.get('sisi_unic_id', '');
        var email = Lampa.Storage.get('account', {}).email;
        if (u.indexOf('box_mac=') == -1) u = Lampa.Utils.addUrlComponent(u, 'box_mac=' + unic_id);else u = u.replace(/box_mac=[^&]+/, 'box_mac=' + unic_id);

        if (email) {
          if (u.indexOf('account_email=') == -1) u = Lampa.Utils.addUrlComponent(u, 'account_email=' + encodeURIComponent(email));else u = u.replace(/account_email=[^&]+/, 'account_email=' + encodeURIComponent(email));
        }

        return u;
      };

      this.playlist = function (add_url_query, oncomplite, error) {
        var load = function load() {
          var status = new Lampa.Status(menu.length);

          status.onComplite = function (data) {
            var items = [];
            menu.forEach(function (m) {
              if (data[m.playlist_url] && data[m.playlist_url].results.length) items.push(data[m.playlist_url]);
            });
            if (items.length) oncomplite(items);else error();
          };

          menu.forEach(function (m) {
            network.silent(_this.account(m.playlist_url + add_url_query), function (json) {
              if (json.list) {
                json.title = Utils.sourceTitle(m.title);
                json.results = Utils.fixList(json.list);
                json.url = m.playlist_url;
                json.collection = true;
                json.line_type = 'none';
                json.card_events = {
                  onMenu: Utils.menu,
                  onEnter: function onEnter(card, element) {
                    Utils.hidePreview();
                    Utils.play(element);
                  }
                };
                Utils.fixCards(json.results);
                delete json.list;
                status.append(m.playlist_url, json);
              } else {
                status.error();
              }
            }, status.error.bind(status));
          });
        };

        if (menu) load();else {
          _this.menu(load, error);
        }
      };

      this.main = function (params, oncomplite, error) {
        this.playlist('', oncomplite, error);
      };

      this.search = function (params, oncomplite, error) {
        this.playlist('?search=' + encodeURIComponent(params.query), oncomplite, error);
      };

      this.qualitys = function (video_url, oncomplite, error) {
        network.silent(this.account(video_url + '&json=true'), oncomplite, error);
      };

      this.clear = function () {
        network.clear();
      };
    }

    var ApiHttp$1 = new ApiHttp();

    var Api = ApiHttp$1; //true ? ApiPWA$1 : ApiHttp$1;

    function Sisi(object) {
      var comp = new Lampa.InteractionMain(object);

      comp.create = function () {
        this.activity.loader(true);
        Api.main(object, this.build.bind(this), this.empty.bind(this));
        return this.render();
      };

      comp.empty = function (er) {
        var _this = this;

        var empty = new Lampa.Empty({
          descr: typeof er == 'string' ? er : Lampa.Lang.translate('empty_text_two')
        });
        Lampa.Activity.all().forEach(function (active) {
          if (_this.activity == active.activity) active.activity.render().find('.activity__body > div')[0].appendChild(empty.render(true));
        });
        this.start = empty.start;
        this.activity.loader(false);
        this.activity.toggle();
      };

      comp.onMore = function (data) {
        Lampa.Activity.push({
          url: data.url,
          title: data.title,
          component: 'sisi_view_' + Defined.use_api,
          page: 2
        });
      };

      comp.onAppend = function (line, element) {
        line.onAppend = function (card) {
          var origFocus = card.onFocus;

          card.onFocus = function (target, card_data) {
            origFocus(target, card_data);
            Utils.preview(target, card_data);
          };
        };
      };

      return comp;
    }

    function View(object) {
      var comp = new Lampa.InteractionCategory(object);
      var menu;

      comp.create = function () {
        var _this = this;

        this.activity.loader(true);
        Api.view(object, function (data) {
          menu = data.menu;

          if (menu) {
            menu.forEach(function (m) {
              var spl = m.title.split(':');
              m.title = spl[0].trim();
              if (spl[1]) m.subtitle = Lampa.Utils.capitalizeFirstLetter(spl[1].trim().replace(/all/i, 'Любой'));

              if (m.submenu) {
                m.submenu.forEach(function (s) {
                  s.title = Lampa.Utils.capitalizeFirstLetter(s.title.trim().replace(/all/i, 'Любой'));
                });
              }
            });
          }

          _this.build(data);

          if (!data.results.length && object.url.indexOf('/bookmarks')) {
            Lampa.Noty.show('Удерживайте ОК на видео для добавления в закладки.', {
              time: 10000
            });
          }
        }, this.empty.bind(this));
      };

      comp.nextPageReuest = function (object, resolve, reject) {
        Api.view(object, resolve.bind(this), reject.bind(this));
      };

      comp.cardRender = function (object, element, card) {
        card.onMenu = function (target, card_data) {
          return Utils.menu(target, card_data);
        };

        card.onEnter = function () {
          Utils.hidePreview();
          Utils.play(element);
        };

        var origFocus = card.onFocus;

        card.onFocus = function (target, card_data) {
          origFocus(target, card_data);
          Utils.preview(target, element);
        };
      };

      comp.filter = function () {
        if (menu) {
          var items = menu.filter(function (m) {
            return !m.search_on;
          });
          var search = menu.find(function (m) {
            return m.search_on;
          });
          if (!search) search = object.search_start;
          if (!items.length && !search) return;
		  
		  if (search)
		  {
			  Lampa.Arrays.insert(items, 0, {
				title: 'Найти',
				onSelect: function onSelect() {
				  Lampa.Input.edit({
					title: 'Поиск',
					value: '',
					free: true,
					nosave: true
				  }, function (value) {
					Lampa.Controller.toggle('content');

					if (value) {
					  Lampa.Activity.push({
						url: search.playlist_url + '?search=' + encodeURIComponent(value),
						title: 'Поиск - ' + value,
						component: 'sisi_view_' + Defined.use_api,
						search_start: search,
						page: 1
					  });
					}
				  });
				}
			  });
		  }
		  
          Lampa.Select.show({
            title: 'Фильтр',
            items: items,
            onBack: function onBack() {
              Lampa.Controller.toggle('content');
            },
            onSelect: function onSelect(a) {
              menu.forEach(function (m) {
                m.selected = m == a ? true : false;
              });

              if (a.submenu) {
                Lampa.Select.show({
                  title: a.title,
                  items: a.submenu,
                  onBack: function onBack() {
                    comp.filter();
                  },
                  onSelect: function onSelect(b) {
                    Lampa.Activity.push({
                      title: object.title,
                      url: b.playlist_url,
                      component: 'sisi_view_' + Defined.use_api,
                      page: 1
                    });
                  }
                });
              } else {
                comp.filter();
              }
            }
          });
        }
      };

      comp.onRight = comp.filter.bind(comp);
      return comp;
    }

    function startPlugin() {
      window['plugin_cloudsisi_' + Defined.use_api + '_ready'] = true;
      var unic_id = Lampa.Storage.get('sisi_unic_id', '');

      if (!unic_id) {
        unic_id = Lampa.Utils.uid(8).toLowerCase();
        Lampa.Storage.set('sisi_unic_id', unic_id);
      }

      Lampa.Component.add('sisi_' + Defined.use_api, Sisi);
      Lampa.Component.add('sisi_view_' + Defined.use_api, View); //Lampa.Search.addSource(Search)

      function addFilter() {
        var activi;
        var timer;
        var button = $("<div class=\"head__action head__settings selector\">\n            <svg height=\"36\" viewBox=\"0 0 38 36\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                <rect x=\"1.5\" y=\"1.5\" width=\"35\" height=\"33\" rx=\"1.5\" stroke=\"currentColor\" stroke-width=\"3\"></rect>\n                <rect x=\"7\" y=\"8\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"currentColor\"></rect>\n                <rect x=\"7\" y=\"16\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"currentColor\"></rect>\n                <rect x=\"7\" y=\"25\" width=\"24\" height=\"3\" rx=\"1.5\" fill=\"currentColor\"></rect>\n                <circle cx=\"13.5\" cy=\"17.5\" r=\"3.5\" fill=\"currentColor\"></circle>\n                <circle cx=\"23.5\" cy=\"26.5\" r=\"3.5\" fill=\"currentColor\"></circle>\n                <circle cx=\"21.5\" cy=\"9.5\" r=\"3.5\" fill=\"currentColor\"></circle>\n            </svg>\n        </div>");
        button.hide().on('hover:enter', function () {
          if (activi) {
            activi.activity.component().filter();
          }
        });
        $('.head .open--search').after(button);
        Lampa.Listener.follow('activity', function (e) {
          if (e.type == 'start') activi = e.object;
          clearTimeout(timer);
          timer = setTimeout(function () {
            if (activi) {
              if (activi.component !== 'sisi_view_' + Defined.use_api) {
                button.hide();
                activi = false;
              }
            }
          }, 1000);

          if (e.type == 'start' && e.component == 'sisi_view_' + Defined.use_api) {
            button.show();
            activi = e.object;
          }
        });
      }

      function addSettings() {
        if (window.sisi_add_param_ready) return;
        window.sisi_add_param_ready = true;
        Lampa.SettingsApi.addComponent({
          component: 'sisi',
          name: 'Клубничка',
          icon: "<svg width=\"200\" height=\"243\" viewBox=\"0 0 200 243\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z\" stroke=\"currentColor\" stroke-width=\"15\"/><path d=\"M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z\" stroke=\"currentColor\" stroke-width=\"15\"/><path d=\"M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z\" stroke=\"currentColor\" stroke-width=\"15\"/><path d=\"M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z\" stroke=\"currentColor\" stroke-width=\"15\"/><rect x=\"39.0341\" y=\"98.644\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"90.8467\" y=\"92.0388\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"140.407\" y=\"98.644\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"116.753\" y=\"139.22\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"64.9404\" y=\"139.22\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"93.0994\" y=\"176.021\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/></svg>"
        });
        Lampa.SettingsApi.addParam({
          component: 'sisi',
          param: {
            name: 'sisi_preview',
            type: 'trigger',
            values: '',
            "default": true
          },
          field: {
            name: 'Предпросмотр',
            description: 'Показывать предпросмотр при наведение на карточку'
          },
          onRender: function onRender(item) {}
        });
      }

      function add() {
        var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <svg width=\"200\" height=\"243\" viewBox=\"0 0 200 243\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z\" stroke=\"currentColor\" stroke-width=\"15\"/><path d=\"M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z\" stroke=\"currentColor\" stroke-width=\"15\"/><path d=\"M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z\" stroke=\"currentColor\" stroke-width=\"15\"/><path d=\"M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z\" stroke=\"currentColor\" stroke-width=\"15\"/><rect x=\"39.0341\" y=\"98.644\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"90.8467\" y=\"92.0388\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"140.407\" y=\"98.644\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"116.753\" y=\"139.22\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"64.9404\" y=\"139.22\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/><rect x=\"93.0994\" y=\"176.021\" width=\"19.1481\" height=\"30.1959\" rx=\"9.57407\" fill=\"currentColor\"/></svg>\n            </div>\n            <div class=\"menu__text\">\u041A\u043B\u0443\u0431\u043D\u0438\u0447\u043A\u0430</div>\n        </li>");

        if (true) {
          var pw = $('<div>c</div>');
          pw.css({
            position: 'absolute',
            right: '-0.3em',
            bottom: '-0.5em',
            backgroundColor: '#fff',
            color: '#000',
            padding: '0.2em 0.4em',
            fontSize: '0.6em',
            borderRadius: '0.5em',
            fontWeight: 900,
            textTransform: 'uppercase'
          });
          button.find('.menu__ico').css('position', 'relative').append(pw);
        }

        button.on('hover:enter', function () {
          Api.menu(function (data) {
            // let items = [{
            //     title: 'Все'
            // }]
            var items = [];

            if (Defined.use_api == 'lampac' || Lampa.Platform.is('android')) {
              items.push({
                title: 'Все'
              });
            }

            data.forEach(function (a) {
              a.title = Utils.sourceTitle(a.title);
            });
            items = items.concat(data);
            Lampa.Select.show({
              title: 'Сайты',
              items: items,
              onSelect: function onSelect(a) {
                if (a.playlist_url) {
                  Lampa.Activity.push({
                    url: a.playlist_url,
                    title: a.title,
                    component: 'sisi_view_' + Defined.use_api,
                    page: 1
                  });
                } else {
                  Lampa.Activity.push({
                    url: '',
                    title: 'Клубничка',
                    component: 'sisi_' + Defined.use_api,
                    page: 1
                  });
                }
              },
              onBack: function onBack() {
                Lampa.Controller.toggle('menu');
              }
            });
          }, function () {});
        });
        $('.menu .menu__list').eq(0).append(button);
        addFilter();
        addSettings();
      }

      if (window.appready) add();else {
        Lampa.Listener.follow('app', function (e) {
          if (e.type == 'ready') add();
        });
      }
    }

    if (!window['plugin_cloudsisi_' + Defined.use_api + '_ready']) {
      startPlugin();
      /*
      if(true){
          let s = document.createElement('script')
              s.onload = function(){
                  Blazor.start({
                      loadBootResource: function (type, name, defaultUri, integrity) {
                          return Defined.framework+'/_framework/' + name
                      }
                  })
                    startPlugin()
              }
                s.setAttribute('autostart', 'false')
              s.setAttribute('src', Defined.framework+'/_framework/blazor.webassembly.js')
          
              document.body.appendChild(s)
      }
      else startPlugin()
      */
    }

})();
