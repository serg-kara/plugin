(function () {
  'use strict';

  if (window.__jellyfinPlugin_loaded) return;
  window.__jellyfinPlugin_loaded = true;

  var STORAGE_PREFIX = 'jellyfin';
  var SETTINGS_COMPONENT = STORAGE_PREFIX;
  var PANEL_COMPONENT = STORAGE_PREFIX + 'Panel';
  var HUB_COMPONENT = STORAGE_PREFIX + 'Hub';
  var HUB_PREVIEW_LIMIT = 12;

  var DEFAULT_URL = '';
  var DEFAULT_API_KEY = '';

  var HTTP_TIMEOUT_MS = 15000;
  var TMDB_TIMEOUT_MS = 10000;
  var TMDB_ENRICH_CONCURRENCY = 8;
  var PAGE_SIZE = 48;
  var IMG_PLACEHOLDER = './img/img_load.svg';
  var API_CACHE_TTL_MS = 30 * 60 * 1000;
  var API_USERDATA_TTL_MS = 3 * 60 * 1000;
  var API_LATEST_TTL_MS = 5 * 60 * 1000;
  var API_CACHE_MAX_ENTRIES = 72;
  var LIBRARY_INDEX_TTL_MS = 10 * 60 * 1000;
  var TMDB_META_TTL_MS = 24 * 60 * 60 * 1000;
  var TMDB_META_MAX_ENTRIES = 400;

  var RELEASE_FOLDER_RE =
    /(Season\s*\d+)|(S\d{1,2}\s*E\d{0,2}\s*WEB)|WEB-DL|WEBRip|BluRay|2160p|1080p|720p|HDR10|HDR\b|\bDV\b|NOIR\s+VER|COLOR\s+VER|x265|x264/i;

  var JELLYFIN_ICON_PATHS =
    '<path d="M256 196.2c-22.4 0-94.8 131.3-83.8 153.4s156.8 21.9 167.7 0-61.3-153.4-83.9-153.4"/>' +
    '<path d="M256 0C188.3 0-29.8 395.4 3.4 462.2s472.3 66 505.2 0S323.8 0 256 0m165.6 404.3c-21.6 43.2-309.3 43.8-331.1 0S211.7 101.4 256 101.4 443.2 361 421.6 404.3"/>';

  var JELLYFIN_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">' +
    JELLYFIN_ICON_PATHS +
    '</svg>';

  var MANIFEST = {
    type: 'video',
    version: '1.4.0',
    author: '@pavelpikta',
    name: 'Jellyfin',
    description: 'Browse and play your Jellyfin library in Lampa',
    component: SETTINGS_COMPONENT,
    icon:
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 512 512" fill="currentColor">' +
      JELLYFIN_ICON_PATHS +
      '</svg>',
  };

  var FULLSTART_BTN_ICON =
    '<svg class="jellyfin-fullstart__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">' +
    JELLYFIN_ICON_PATHS +
    '</svg>';

  var HEAD_ICON_SVG = JELLYFIN_ICON_SVG;

  var cachedUserId = '';
  var cachedAutoUserName = '';
  var libraryIndex = { byTmdb: {}, loadedAt: 0 };
  var tmdbMetaCache = {};
  var tmdbPosterInflight = {};
  var apiResponseCache = {};
  var apiCacheOrder = [];
  var apiInflight = {};
  var apiCacheEpoch = 0;
  var libraryIndexInflight = null;
  var hubDataInflight = null;

  function addLang() {
    Lampa.Lang.add({
      jellyfin_title: { en: 'Jellyfin', ru: 'Jellyfin' },
      jellyfin_movies: { en: 'Movies', ru: 'Фильмы' },
      jellyfin_series: { en: 'TV Series', ru: 'Сериалы' },
      jellyfin_resume: { en: 'Continue watching', ru: 'Продолжить просмотр' },
      jellyfin_latest: { en: 'Latest added', ru: 'Недавно добавлено' },
      jellyfin_stat_resume: { en: 'Continue', ru: 'Продолжить' },
      jellyfin_stat_latest: { en: 'Latest', ru: 'Недавние' },
      jellyfin_stat_movies: { en: 'Movies', ru: 'Фильмы' },
      jellyfin_stat_series: { en: 'Series', ru: 'Сериалы' },
      jellyfin_play: { en: 'Play', ru: 'Смотреть' },
      jellyfin_open_card: { en: 'Open card', ru: 'Открыть карточку' },
      jellyfin_episodes: { en: 'Episodes', ru: 'Эпизоды' },
      jellyfin_pick_episode: { en: 'Choose episode', ru: 'Выберите эпизод' },
      jellyfin_empty: { en: 'Library is empty', ru: 'Библиотека пуста' },
      jellyfin_empty_descr: {
        en: 'Add media to Jellyfin or check connection settings',
        ru: 'Добавьте медиа в Jellyfin или проверьте настройки подключения',
      },
      jellyfin_retry: { en: 'Retry', ru: 'Повторить' },
      jellyfin_open_settings: { en: 'Open settings', ru: 'Открыть настройки' },
      jellyfin_auth_ok: { en: 'Connection OK', ru: 'Подключение успешно' },
      jellyfin_auth_fail: { en: 'Connection failed', ru: 'Не удалось подключиться' },
      jellyfin_test: { en: 'Test connection', ru: 'Проверить подключение' },
      jellyfin_url: { en: 'Server URL', ru: 'URL сервера' },
      jellyfin_key: { en: 'API key', ru: 'API-ключ' },
      jellyfin_no_tmdb: {
        en: 'No TMDB id on this item',
        ru: 'Нет TMDB id у этого элемента',
      },
      jellyfin_error: { en: 'Something went wrong', ru: 'Что-то пошло не так' },
      jellyfin_settings_name: { en: 'Jellyfin', ru: 'Jellyfin' },
      jellyfin_settings_hint: {
        en: 'Jellyfin URL and API key from Dashboard → API Keys',
        ru: 'URL Jellyfin и API-ключ из Панель → Ключи API',
      },
      jellyfin_set_dedupe: {
        en: 'Merge duplicates (TMDB)',
        ru: 'Объединять дубликаты (TMDB)',
      },
      jellyfin_set_hide_folders: {
        en: 'Hide release folders',
        ru: 'Скрывать папки релизов',
      },
      jellyfin_set_tmdb_posters: {
        en: 'TMDB posters & titles',
        ru: 'Постеры и названия из TMDB',
      },
      jellyfin_set_full_button: {
        en: 'Play button on Lampa card',
        ru: 'Кнопка воспроизведения на карточке',
      },
      jellyfin_more: { en: 'More', ru: 'Ещё' },
      jellyfin_libraries: { en: 'Library', ru: 'Библиотека' },
      jellyfin_set_tap_play: {
        en: 'Tap card to play (long = menu)',
        ru: 'Нажатие — смотреть (долгое — меню)',
      },
      jellyfin_set_transcode: {
        en: 'HLS transcoding (Lampa player)',
        ru: 'HLS-транскодинг (плеер Lampa)',
      },
      jellyfin_set_stream_hint: {
        en: 'When on, Lampa player uses HLS transcode with quality selection. External players always use direct stream.',
        ru: 'Если включено, плеер Lampa использует HLS-транскодинг с выбором качества. Внешние плееры всегда получают прямой поток.',
      },
      jellyfin_play_from_library: {
        en: 'Play from Jellyfin',
        ru: 'Смотреть из Jellyfin',
      },
      jellyfin_pick_quality: { en: 'Choose quality', ru: 'Выберите качество' },
      jellyfin_play_4k: { en: 'Play 4K', ru: 'Смотреть 4K' },
      jellyfin_play_1080: { en: 'Play 1080p', ru: 'Смотреть 1080p' },
      jellyfin_watched: { en: 'Watched', ru: 'Просмотрено' },
      jellyfin_mark_watched: { en: 'Mark as watched', ru: 'Отметить просмотренным' },
      jellyfin_mark_unwatched: { en: 'Mark as unwatched', ru: 'Снять отметку просмотра' },
      jellyfin_mark_watched_ok: { en: 'Marked as watched', ru: 'Отмечено как просмотрено' },
      jellyfin_mark_unwatched_ok: { en: 'Marked as unwatched', ru: 'Отметка просмотра снята' },
      jellyfin_season_n: { en: 'Season {0}', ru: 'Сезон {0}' },
      jellyfin_user: { en: 'Jellyfin user', ru: 'Пользователь Jellyfin' },
      jellyfin_user_pick: { en: 'Choose user', ru: 'Выбрать пользователя' },
      jellyfin_user_auto: { en: 'First user (auto)', ru: 'Первый пользователь (авто)' },
    });
  }

  function storageStr(suffix, fallback) {
    try {
      var v =
        String(Lampa.Storage.get(STORAGE_PREFIX + suffix) || '').trim() ||
        String(Lampa.Storage.field(STORAGE_PREFIX + suffix) || '').trim();
      if (v) return v;
    } catch (e) { }
    return fallback == null ? '' : String(fallback);
  }

  function storageToggle(suffix, defaultOn) {
    try {
      var v = Lampa.Storage.field(STORAGE_PREFIX + suffix);
      if (v === true) return true;
      if (v === false) return false;
    } catch (e) { }
    return defaultOn !== false;
  }

  function normalizeBase(raw) {
    var s = String(raw || '').trim().replace(/\/+$/, '');
    if (!s.length) return '';
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    return s;
  }

  function apiBase() {
    return normalizeBase(storageStr('Url', DEFAULT_URL));
  }

  function apiKey() {
    return storageStr('Key', DEFAULT_API_KEY);
  }

  function apiCacheKey(url) {
    return apiCacheEpoch + '|' + String(url || '');
  }

  function apiCacheTtl(url) {
    var u = String(url || '');
    if (/\/Items\/Resume(?:\?|$)/i.test(u)) return 0;
    if (/MediaSources/i.test(u)) return 0;
    if (/\/PlayedItems\//i.test(u)) return 0;
    if (/\/Items\/Latest/i.test(u)) return API_LATEST_TTL_MS;
    if (/UserData/i.test(u)) return API_USERDATA_TTL_MS;
    return API_CACHE_TTL_MS;
  }

  function trimApiCache() {
    while (apiCacheOrder.length > API_CACHE_MAX_ENTRIES) {
      var oldKey = apiCacheOrder.shift();
      delete apiResponseCache[oldKey];
    }
  }

  function readApiCache(url) {
    var ttl = apiCacheTtl(url);
    if (!ttl) return null;
    var key = apiCacheKey(url);
    var entry = apiResponseCache[key];
    if (!entry) return null;
    if (Date.now() - entry.loadedAt > ttl) {
      delete apiResponseCache[key];
      apiCacheOrder = apiCacheOrder.filter(function (k) {
        return k !== key;
      });
      return null;
    }
    return entry.data;
  }

  function writeApiCache(url, data) {
    if (!apiCacheTtl(url)) return;
    var key = apiCacheKey(url);
    if (apiResponseCache[key]) {
      apiCacheOrder = apiCacheOrder.filter(function (k) {
        return k !== key;
      });
    }
    apiResponseCache[key] = { data: data, loadedAt: Date.now() };
    apiCacheOrder.push(key);
    trimApiCache();
  }

  function resetApiCacheStore() {
    apiResponseCache = {};
    apiCacheOrder = [];
    apiInflight = {};
  }

  function clearApiCache() {
    apiCacheEpoch++;
    resetApiCacheStore();
  }

  function invalidateUserDataCaches() {
    apiCacheEpoch++;
    resetApiCacheStore();
    libraryIndex.loadedAt = 0;
    libraryIndexInflight = null;
    hubDataInflight = null;
  }

  function currentTmdbLang() {
    return Lampa.Storage.field('tmdb_lang') || Lampa.Storage.get('language') || 'en';
  }

  function tmdbCacheKey(tmdb) {
    return String(tmdb.method || '') + '/' + String(tmdb.id || '') + '/' + currentTmdbLang();
  }

  function trimTmdbMetaCache() {
    var keys = Object.keys(tmdbMetaCache);
    if (keys.length <= TMDB_META_MAX_ENTRIES) return;
    keys
      .sort(function (a, b) {
        return (tmdbMetaCache[a].loadedAt || 0) - (tmdbMetaCache[b].loadedAt || 0);
      })
      .slice(0, keys.length - TMDB_META_MAX_ENTRIES)
      .forEach(function (key) {
        delete tmdbMetaCache[key];
      });
  }

  function readTmdbMetaCache(tmdb) {
    var key = tmdbCacheKey(tmdb);
    var entry = tmdbMetaCache[key];
    if (!entry) return null;
    if (Date.now() - entry.loadedAt > TMDB_META_TTL_MS) {
      delete tmdbMetaCache[key];
      return null;
    }
    return entry.data;
  }

  function writeTmdbMetaCache(tmdb, meta) {
    if (!meta) return;
    tmdbMetaCache[tmdbCacheKey(tmdb)] = { data: meta, loadedAt: Date.now() };
    trimTmdbMetaCache();
  }

  function clearTmdbMetaCache() {
    tmdbMetaCache = {};
    tmdbPosterInflight = {};
  }

  var netInstance = null;
  function network() {
    if (!netInstance && Lampa.Reguest) netInstance = new Lampa.Reguest();
    return netInstance;
  }

  function jfHttp(path, opts) {
    opts = opts || {};
    var base = apiBase();
    var key = apiKey();
    if (!base || !key) return Promise.reject(new Error('Jellyfin URL or API key is empty'));

    var p = String(path || '');
    var url = base + (p.charAt(0) === '/' ? p : '/' + p);
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    if (url.indexOf('api_key=') < 0) url += sep + 'api_key=' + encodeURIComponent(key);

    var timeout = typeof opts.timeout === 'number' ? opts.timeout : HTTP_TIMEOUT_MS;
    var dataType = opts.dataType || 'json';
    var method = (opts.method || 'GET').toUpperCase();
    var postData = method === 'POST' && opts.jsonBody === undefined ? opts.data : undefined;
    var net = network();
    var useJsonAjax = opts.jsonBody !== undefined || method === 'DELETE';
    var useCache = method === 'GET' && !useJsonAjax && opts.cache !== false;
    var cached = useCache ? readApiCache(url) : null;
    if (cached !== null) return Promise.resolve(cached);
    if (useCache && apiInflight[apiCacheKey(url)]) return apiInflight[apiCacheKey(url)];

    var request = new Promise(function (resolve, reject) {
      function ok(raw) {
        if (dataType === 'json' && typeof raw === 'string' && raw.length) {
          try {
            raw = JSON.parse(raw);
          } catch (ignore) { }
        }
        if (useCache) writeApiCache(url, raw);
        resolve(raw);
      }
      function fail(err) {
        var msg =
          (err && (err.decode_error || err.responseText || err.statusText || err.message)) ||
          (err && err.responseJSON && err.responseJSON.title) ||
          'Request failed';
        reject(new Error(msg));
      }

      if (useJsonAjax) {
        $.ajax({
          url: url,
          type: method,
          timeout: timeout,
          dataType: dataType === 'text' ? 'text' : 'json',
          contentType: opts.jsonBody !== undefined ? 'application/json' : undefined,
          data: opts.jsonBody !== undefined ? JSON.stringify(opts.jsonBody) : undefined,
        })
          .done(ok)
          .fail(fail);
        return;
      }

      if (!net) {
        Lampa.Network.silent(url, ok, fail, postData, { timeout: timeout, dataType: dataType });
        return;
      }

      net.timeout(timeout);
      net.silent(url, ok, fail, postData, { timeout: timeout, dataType: dataType });
    });

    if (useCache) {
      var inflightKey = apiCacheKey(url);
      apiInflight[inflightKey] = request.finally(function () {
        delete apiInflight[inflightKey];
      });
      return apiInflight[inflightKey];
    }

    return request;
  }

  function tmdbJson(url) {
    if (tmdbPosterInflight[url]) return tmdbPosterInflight[url];
    var net = network();
    var inner = new Promise(function (resolve, reject) {
      if (!net) {
        Lampa.Network.silent(url, resolve, reject, null, {
          timeout: TMDB_TIMEOUT_MS,
          dataType: 'json',
        });
        return;
      }
      net.timeout(TMDB_TIMEOUT_MS);
      net.silent(url, resolve, reject, null, { timeout: TMDB_TIMEOUT_MS, dataType: 'json' });
    });
    tmdbPosterInflight[url] = inner.finally(function () {
      delete tmdbPosterInflight[url];
    });
    return tmdbPosterInflight[url];
  }

  function storedUserId() {
    return storageStr('UserId', '');
  }

  function storedUserLabel() {
    return storageStr('UserLabel', '');
  }

  function invalidateUserCache() {
    cachedUserId = '';
    cachedAutoUserName = '';
    clearApiCache();
    clearTmdbMetaCache();
    libraryIndex.loadedAt = 0;
    libraryIndexInflight = null;
    hubDataInflight = null;
  }

  function fetchUsers() {
    return jfHttp('/Users').then(function (users) {
      if (!Array.isArray(users) || !users.length) throw new Error('No Jellyfin users');
      return users;
    });
  }

  function defaultUserFromList(users) {
    if (!users || !users.length) return null;
    var i;
    for (i = 0; i < users.length; i++) {
      if (users[i] && users[i].EnableAutoLogin) return users[i];
    }
    return users
      .slice()
      .sort(function (a, b) {
        return String(a.Name || '').localeCompare(String(b.Name || ''), undefined, {
          sensitivity: 'base',
        });
      })[0];
  }

  function rememberAutoUser(user) {
    if (!user) return;
    cachedAutoUserName = String(user.Name || '');
    if (!storedUserId()) cachedUserId = String(user.Id || '');
  }

  function prefetchAutoUser() {
    if (storedUserId()) return;
    fetchUsers()
      .then(function (users) {
        rememberAutoUser(defaultUserFromList(users));
        try {
          Lampa.Settings.update();
        } catch (e) { }
        syncUserInfoField();
      })
      .catch(function () { });
  }

  function resolveUserId() {
    var picked = storedUserId();
    if (picked) {
      cachedUserId = picked;
      return Promise.resolve(picked);
    }
    if (cachedUserId) return Promise.resolve(cachedUserId);
    return fetchUsers().then(function (users) {
      var user = defaultUserFromList(users);
      if (!user || !user.Id) throw new Error('Invalid Jellyfin user id');
      rememberAutoUser(user);
      return cachedUserId;
    });
  }

  function currentUserLabel() {
    var label = storedUserLabel();
    if (label) return label;
    if (cachedAutoUserName) return cachedAutoUserName;
    return Lampa.Lang.translate('jellyfin_user_auto');
  }

  function autoUserPickTitle(users) {
    var user = defaultUserFromList(users);
    var title = Lampa.Lang.translate('jellyfin_user_auto');
    if (user && user.Name) title += ' — ' + user.Name;
    return title;
  }

  function syncUserInfoField() {
    var $descr = $('[data-name="' + STORAGE_PREFIX + 'UserInfo"] .settings-param__descr');
    if ($descr.length) $descr.text(currentUserLabel());
  }

  function pickUserFromList(onDone) {
    var ctl = enabledControllerName('settings');
    fetchUsers()
      .then(function (users) {
        var items = users.map(function (user) {
          return { title: user.Name || user.Id, userId: String(user.Id || '') };
        });
        rememberAutoUser(defaultUserFromList(users));
        items.unshift({
          title: autoUserPickTitle(users),
          userId: '',
        });
        Lampa.Select.show({
          title: Lampa.Lang.translate('jellyfin_user_pick'),
          items: items,
          onBack: function () {
            deferControllerToggle(ctl);
            if (typeof onDone === 'function') onDone();
          },
          onSelect: function (item) {
            if (!item) return;
            if (item.userId) {
              Lampa.Storage.set(STORAGE_PREFIX + 'UserId', item.userId);
              Lampa.Storage.set(STORAGE_PREFIX + 'UserLabel', item.title || '');
            } else {
              Lampa.Storage.set(STORAGE_PREFIX + 'UserId', '');
              Lampa.Storage.set(STORAGE_PREFIX + 'UserLabel', '');
            }
            invalidateUserCache();
            if (item.userId) cachedAutoUserName = '';
            else prefetchAutoUser();
            Lampa.Settings.update();
            syncUserInfoField();
            deferControllerToggle(ctl);
            if (typeof onDone === 'function') onDone();
          },
        });
      })
      .catch(function () {
        Lampa.Bell.push({ text: Lampa.Lang.translate('jellyfin_auth_fail') });
      });
  }

  function posterUrl(item) {
    if (!item) return IMG_PLACEHOLDER;
    var tag =
      (item.ImageTags && item.ImageTags.Primary) || item.SeriesPrimaryImageTag || '';
    if (!tag) return IMG_PLACEHOLDER;
    var id = item.Id;
    if (!id && item.SeriesId) id = item.SeriesId;
    if (!id) return IMG_PLACEHOLDER;
    return (
      apiBase() +
      '/Items/' +
      encodeURIComponent(id) +
      '/Images/Primary?maxHeight=500&tag=' +
      encodeURIComponent(tag) +
      '&api_key=' +
      encodeURIComponent(apiKey())
    );
  }

  function buildTmdbImageUrl(path) {
    var posterSize = Lampa.Storage.field('poster_size') || 'w342';
    return Lampa.Api.img(path, posterSize);
  }

  function getDeviceId() {
    var key = STORAGE_PREFIX + 'DeviceId';
    var id = String(Lampa.Storage.get(key, '') || '').trim();
    if (id) return id;
    id = 'lampa-' + (Lampa.Utils && Lampa.Utils.uid ? Lampa.Utils.uid() : String(Date.now()));
    Lampa.Storage.set(key, id);
    return id;
  }

  function screenTv() {
    return (
      Lampa.Platform &&
      typeof Lampa.Platform.screen === 'function' &&
      Lampa.Platform.screen('tv')
    );
  }

  function bindScrollLayerVisible(scroll) {
    scroll.onScroll = function () {
      if (Lampa.Layer && Lampa.Layer.visible) Lampa.Layer.visible(scroll.render(true));
    };
  }

  function scheduleReflowFocus(scroll, owner, lastEl, opts) {
    opts = opts || {};
    setTimeout(function () {
      try {
        if (opts.layerOnly) {
          if (Lampa.Layer && Lampa.Layer.visible) Lampa.Layer.visible(scroll.render(true));
          return;
        }
        var act = typeof Lampa.Activity.active === 'function' ? Lampa.Activity.active() : null;
        if (owner && (!act || act.activity !== owner)) return;
        var ctr = Lampa.Controller.enabled();
        var allowed = opts.controller ? [opts.controlle