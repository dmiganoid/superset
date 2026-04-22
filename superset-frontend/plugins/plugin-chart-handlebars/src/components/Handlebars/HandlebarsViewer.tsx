  /**
   * Licensed to the Apache Software Foundation (ASF) under one
   * or more contributor license agreements.  See the NOTICE file
   * distributed with this work for additional information
   * regarding copyright ownership.  The ASF licenses this file
   * to you under the Apache License, Version 2.0 (the
   * "License"); you may not use this file except in compliance
   * with the License.  You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing,
   * software distributed under the License is distributed on an
   * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
   * KIND, either express or implied.  See the License for the
   * specific language governing permissions and limitations
   * under the License.
   */
  import { t } from '@superset-ui/core';
  import { styled } from '@apache-superset/core/ui';
  import { SafeMarkdown } from '@superset-ui/core/components';
  import { extendedDayjs as dayjs } from '@superset-ui/core/utils/dates';
  import Handlebars from 'handlebars';
  import { useEffect, useRef, useState } from 'react';
  import { isPlainObject } from 'lodash';
  import Helpers from 'just-handlebars-helpers';
  import HandlebarsGroupBy from 'handlebars-group-by';

  export interface HandlebarsViewerProps {
    templateSource: string;
    data: any;
  }

  const stripScripts = (html: string) =>
    html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  const buildSafeInlineScript = (code: string) => `
  (() => {
    const wrap = fn => {
      if (typeof fn !== 'function') return fn;
      return function (...args) {
        try {
          return fn.apply(this, args);
        } catch (e) {
          console.warn('[Handlebars JS]', e);
        }
      };
    };

    const _setTimeout = window.setTimeout.bind(window);
    const _setInterval = window.setInterval.bind(window);
    const _requestAnimationFrame = window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : null;

    const setTimeout = (cb, ...args) =>
      _setTimeout(typeof cb === 'function' ? wrap(cb) : cb, ...args);

    const setInterval = (cb, ...args) =>
      _setInterval(typeof cb === 'function' ? wrap(cb) : cb, ...args);

    const requestAnimationFrame = cb =>
      _requestAnimationFrame
        ? _requestAnimationFrame(typeof cb === 'function' ? wrap(cb) : cb)
        : _setTimeout(typeof cb === 'function' ? wrap(cb) : cb, 16);

    try {
  ${code
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n')}
    } catch (e) {
      console.warn('[Handlebars JS]', e);
    }
  })();
  `;

  export const HandlebarsViewer = ({
    templateSource,
    data,
  }: HandlebarsViewerProps) => {
    const [renderedTemplate, setRenderedTemplate] = useState('');
    const [error, setError] = useState('');
    const containerRef = useRef<HTMLDivElement | null>(null);

    const appContainer = document.getElementById('app');
    const { common } = JSON.parse(
      appContainer?.getAttribute('data-bootstrap') || '{}',
    );
    const htmlSanitization = common?.conf?.HTML_SANITIZATION ?? true;
    const htmlSchemaOverrides =
      common?.conf?.HTML_SANITIZATION_SCHEMA_EXTENSIONS || {};
    const isExplorePage = window.location.pathname.includes('/explore') || window.location.pathname.includes('/chart');
    const existingNonceScript = document.querySelector('script[nonce]') as | HTMLScriptElement | null;

    const nonce = existingNonceScript?.nonce || '';

    useEffect(() => {
      try {
        const template = Handlebars.compile(templateSource);
        const result = template(data);
        setRenderedTemplate(result);
        setError('');
      } catch (error) {
        setRenderedTemplate('');
        setError(String(error));
      }
    }, [templateSource, data]);

    useEffect(() => {
    const root = containerRef.current;
    if (!root || !renderedTemplate || htmlSanitization) return;

    // В редакторе только показываем HTML, но не запускаем JS
    if (isExplorePage) {
      root.innerHTML = stripScripts(renderedTemplate);
      return;
    }

    // На дашборде рендерим HTML и запускаем скрипты
    root.innerHTML = renderedTemplate;

    const scripts = Array.from(root.querySelectorAll('script'));
    if (!scripts.length) return;

    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      if (nonce) {
        newScript.nonce = nonce;
      }
      
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });

      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else if (oldScript.textContent) {
        newScript.textContent = buildSafeInlineScript(oldScript.textContent);
      }

      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [renderedTemplate, htmlSanitization, isExplorePage]);

    const Error = styled.pre`
      white-space: pre-wrap;
    `;

    if (error) {
      return <Error>{error}</Error>;
    }

    if (!renderedTemplate) {
      return <p>{t('Loading...')}</p>;
    }

    // JS / raw HTML mode
    if (!htmlSanitization) {
  // В режиме редактирования — НЕ выполняем JS
      if (isExplorePage) {
        return (
          <div
            dangerouslySetInnerHTML={{
              __html: stripScripts(renderedTemplate),
            }}
          />
        );
  }

  // В дашборде — выполняем JS как раньше
  return <div ref={containerRef} />;
}

    // Обычный безопасный режим
    return (
      <div ref={containerRef}>
        <SafeMarkdown
          source={renderedTemplate}
          htmlSanitization={htmlSanitization}
          htmlSchemaOverrides={htmlSchemaOverrides}
        />
      </div>
    );
  };

  //  usage: {{ dateFormat my_date format="MMMM YYYY" }}
  Handlebars.registerHelper('dateFormat', function (context, block) {
    const f = block.hash.format || 'YYYY-MM-DD';
    return dayjs(context).format(f);
  });

  // usage: {{  }}
  Handlebars.registerHelper('stringify', (obj: any, obj2: any) => {
    if (obj2 === undefined) {
      throw new Error('Please call with an object. Example: `stringify myObj`');
    }
    return isPlainObject(obj) ? JSON.stringify(obj) : String(obj);
  });

  Handlebars.registerHelper(
    'formatNumber',
    function (number: any, locale = 'en-US') {
      if (typeof number !== 'number') {
        return number;
      }
      return number.toLocaleString(locale);
    },
  );

  // usage: {{parseJson jsonString}}
  Handlebars.registerHelper('parseJson', (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      if (error instanceof Error) {
        error.message = `Invalid JSON string: ${error.message}`;
        throw error;
      }
      throw new Error(`Invalid JSON string: ${String(error)}`);
    }
  });

  Helpers.registerHelpers(Handlebars);
  HandlebarsGroupBy.register(Handlebars);