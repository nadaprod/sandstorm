A Sandstorm app can export an HTTP-based API to the internet. This
page explains how to support the following use-cases while relying on
Sandstorm for access control.

* Allowing a mobile client app to connect to a Sandstorm server.

* Allowing static web pages to interact with Sandstorm servers. (For
  instance, this could be used to implement comments on a blog
  published via [Sandstorm's web publishing](web-publishing.md) --
  posting a comment would make an API request.)

* Federation between servers.

* Many other things!

## Overview

When custom code needs to interact with a Sandstorm app, it sends a
HTTP request to the **API hostname** of the Sandstorm host where app
is running, along with an **API token** embedded in an `Authorization`
HTTP header.

You can try making a request to a Sandstorm app's API right now via `curl`:

```bash
curl -H "Authorization: Bearer 49Np9sqkYV4g_FpOQk1p0j1yJlvoHrZm9SVhQt7H2-9" https://alpha-api.sandstorm.io/
```

Sandstorm is responsible for generating the API token. The API token
is used for both **access control** and **routing a request** to the
appropriate grain.

When a request comes in with a valid API token, Sandstorm sanitizes
the request, removing the `Cookie` header and the API token, adding
typical Sandstorm authentication headers like `X-Sandstorm-User-Id`,
and passes the request to the app. Sandstorm combines it with the app
package's `bridgeConfig.apiPath` as part of sending the request to the
grain. Sandstorm sanitizes responses and removes any `Set-Cookie`
response header. Sandstorm **removes the user IP address** from the
request by default; API clients can
[opt-in](#getting-the-user-ip-address) to sending it.

The API endpoint is set up to allow **cross-origin requests from any
origin**, which means you can access an API from `XMLHttpRequest` on
any domain.

An app can **request the generation of an API token**, and a Sandstorm
user can manually create a valid API token by clicking on the Webkey icon
in the Sandstorm shell.

## How to generate an API token

There are various ways to obtain an API token:

* The best is via *offer templates*, where the app specifies textual
  information for the user of the app, and Sandstorm places the token
  into this template before displaying it to the user.

* The user can click the key icon in the top bar when they have an app
  open.

In the future, we will implement an OAuth flow allowing a third party
to initiate a request for access to the user's apps.

Sandstorm's `HackSessionContext` exports a Cap'n Proto RPC method
called `HackSessionContext.generateApiToken()`. That method is
deprecated in favor of offer templates. If you need to use it, read
the [web publishing guide](web-publishing.md) for more about how to
access `HackSessionContext`.

## Creating an offer template

An _offer template_ is a way for Sandstorm to display an API token to
the user without the app being able to see the token.

You can see an example by launching [a GitWeb
demo](https://oasis.sandstorm.io/appdemo/6va4cjamc21j0znf5h5rrgnv0rpyvh1vaxurkrgknefvj0x63ash).

We implement this as an `IFRAME` from the Sandstorm server. The grain
cannot peek into the element. To fill the `IFRAME` with helpful information
for the user, including an API token, client-side Javascript in the grain
provides a template to Sandstorm, and Sandstorm responds with a URL that
the app can use as the `SRC` of the `IFRAME`.

To create an offer template:

1. Create an `IFRAME` element within your page with a memorable ID. For example:

  ```html
  <iframe style="width: 100%; height: 55px; margin: 0; border: 0;" id="offer-iframe">
  </iframe>
  ```

2. Add JavaScript to your page to ask Sandstorm to fill the iframe with
  content. For example:

  ```html
  <script>
    function fillIframe() {
      var template = "You can use the $API_TOKEN key to reach me at $API_HOST.";
      window.parent.postMessage({renderTemplate: {
        rpcId: "0",
        template: template,
        clipboardButton: 'left'
      }}, "*");
    }
  </script>
  ```

3. Add a window event listener so the Sandstorm shell can provide the
  URL to you.

  ```html
  <script>
    var messageListener = function(event) {
      if (event.data.rpcId === "0") {
        if (event.data.error) {
          console.log("ERROR: " + event.data.error);
        } else {
          var el = document.getElementById("offer-iframe");
          el.setAttribute("src", event.data.uri);
        }
      }
    };

    window.addEventListener("message", messageListener);
  </script>
  ```

  As an implementation detail: the `rpcId` in the `event.data` response
  is the same as the value provided to the `renderTemplate` request. We
  used `"0"` here; you can choose any value.

4. When your page loads, make the request.

  ```html
  <script>
  document.addEventListener("DOMContentLoaded", fillIframe);
  </script>
  ```

5. Your offer template will now contain text such as:

  ```html
  You can use the 49Np9sqkYV4g_FpOQk1p0j1yJlvoHrZm9SVhQt7H2-9 key to reach me at https://alpha-api.sandstorm.io/.
  ```

**Note**: API tokens created this way must be used within 5 minutes,
or else they [automatically
expire](https://github.com/sandstorm-io/sandstorm/search?utf8=%E2%9C%93&q=selfDestructDuration). To
prevent this from becoming a serious problem, the Sandstorm shell
automatically refreshes the IFRAME every 5 minutes.

## Parameters to renderTemplate()

`renderTemplate()` accepts the following parameters:

* `rpcId`: **String** of a message ID that will be passed back to your
  code.

* `template`: **String** to display to the user, where `$API_HOST`,
  `$API_TOKEN`, and `$GRAIN_TITLE_SLUG` will be replaced.

* `petname`: **String (optional)** of a name that this API token will
  have, when the user lists the API tokens and sharing links they have
  generated.

* `roleAssignment`: **roleAssignmentPattern (optional)** of
  permissions to apply to inbound requests. Use this to create API
  tokens with limited permissions, such as a read-only view.

* `forSharing`: **Boolean (optional)** true if this token should
  represent the anonymous user. You can use this to detach the token
  from the user who created it. **Note** that this also allows users
  to redeem it as a sharing link of the form
  `https://sandstorm.example.com/shared/$API_TOKEN`.

* `clipboardButton`: **String (optional)** to display a copy-to-clipboard
  button in either the top left or top right corner of the `IFRAME`.
  Valid values are `left` and `right`. Left unspecified, no button is shown.

## Getting the user IP address

By default, for privacy, Sandstorm removes the user's IP address from
API requests. The API _client code_ can request that Sandstorm pass
the IP address to the grain by setting a header on the API request:


```
X-Sandstorm-Passthrough: address
```

Your app will receive the IP address via the `X-Real-IP` request
header, assuming it is using `sandstorm-http-bridge`.

To make sure API requests to your API provide an IP address, if your
API requires an IP address to be useful, your app can provide sample
JavaScript code that sets header on `XMLHttpRequest` calls to the API
endpoint.

## About WebKeys

When a user clicks on the key icon within app, it creates a
[webkey](http://waterken.sourceforge.net/web-key/), which is a
combination of an endpoint URL and an API token separated by a `#`. An
example is:

    https://alpha-api.sandstorm.io#49Np9sqkYV4g_FpOQk1p0j1yJlvoHrZm9SVhQt7H2-9

This format is intentionally chosen to look like a valid URL that
could be opened in a browser. Eventually, when such a URL is loaded
directly in a browser, Sandstorm will show the user information about
the API and possibly offer the ability to explore the API and initiate
requests for debugging purposes. As of this writing, these features
are not yet implemented.

The part of the webkey before the `#` is the API endpoint for the
server (in this case, for alpha.sandstorm.io). After the `#` is the
API token. So, to make a request to the webkey specified above, you
might use the following `curl` command:

    curl -H "Authorization: Bearer 49Np9sqkYV4g_FpOQk1p0j1yJlvoHrZm9SVhQt7H2-9" https://alpha-api.sandstorm.io

## Bearer tokens vs. Basic auth

Typically, HTTP APIs on Sandstorm should be accessed using an OAuth
2.0-style Bearer token in an Authorization header:

```bash
    Authorization: Bearer <token>
```

Because an `Authorization` header is required, it is impossible for a
web browser to open a Sandstorm HTTP API directly in a browser
window. This is intentional: this prevents Sandstorm apps from
executing arbitrary scripts from the API host.

Some apps are unable to use Bearer tokens; they can use HTTP Basic
auth. The Sandstorm code maintains a [whitelist of `User-Agent`
strings](https://github.com/sandstorm-io/sandstorm/search?utf8=%E2%9C%93&q=BASIC_AUTH_USER_AGENTS)
that are allowed to use Basic auth. If your Sandstorm app has a client
that cannot use an Authoriztion header, consider [filing a
bug](https://github.com/sandstorm-io/sandstorm/issues) requesting the
white-listing of its user-agent value.
