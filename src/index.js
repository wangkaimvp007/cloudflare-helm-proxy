addEventListener('fetch', (event) => {
  event.passThroughOnException()
  event.respondWith(handleRequest(event))
})

const routes = {
  stable: {
    url: 'https://helm.camunda.io/',
    replaces: {
      'helm.camunda.io': 'helm-camunda.wakaka0818.com',
    },
  },
}

async function handleRequest(event) {
  try {
    const request = event.request
    const url = new URL(request.url)
    const pathname = url.pathname
    const p = pathname.split('/').length > 0? pathname.split('/'):[pathname];  
    if (p.length > 0) {
      for (const [key, value] of Object.entries(routes)) {
        if (p[0] == key) {
          const mirrorUrl = new URL(value.url)
          p[0] = mirrorUrl.pathname
          mirrorUrl.pathname = p.join('/')
          console.log('request', mirrorUrl.toString())
          const resp = await fetch(mirrorUrl)
          if (
            value.replaces &&
            (pathname.endsWith('index.yml') || pathname.endsWith('index.yaml'))
          ) {
            const contentType = resp.headers.get('content-type')
            switch (contentType) {
              case 'text/yaml':
                let respStr = await resp.text()
                for (let [o, n] of Object.entries(value.replaces)) {
                  n = n.replaceAll('$host', url.hostname)
                  respStr = respStr.replaceAll(o, n)
                  console.log(`replace ${o} to ${n} in ${mirrorUrl} response`)
                }
                return new Response(respStr, {
                  status: resp.status,
                  headers: resp.headers,
                })
              default:
                console.log(`ignore ${contentType} response`)
                return resp
            }
          }
          return resp
        }
      }
    }
    return new Response(
      JSON.stringify({ message: 'no routes matched' }, { status: 404 }),
    )
  } catch (e) {
    console.warn('[handleRequest]', e.toString())
    return new Response(
      JSON.stringify({
        message: e.toString(),
      }),
      { status: 500 },
    )
  }
}
