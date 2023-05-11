import json
import os
import re
import tornado
from bs4 import BeautifulSoup
from jupyter_server.base.handlers import JupyterHandler
from tornado import web, httpclient
from ._version import __version__

try:
    import lxml
    lxml
except ImportError:
    BEAUTIFULSOUP_BUILDER = 'html.parser'
else:
    BEAUTIFULSOUP_BUILDER = 'lxml'

# a regular expression to match paths against the Spark on EMR proxy paths
PROXY_PATH_RE = re.compile(r'\/proxy\/application_\d+_\d+\/(.*)')
# a tuple of tuples with tag names and their attribute to automatically fix
PROXY_ATTRIBUTES = (
    (('a', 'link'), 'href'),
    (('img', 'script'), 'src'),
)
PROXY_ROOT_BASE = '/sparkmonitor/'
PORT_PARSE = re.compile(r'[0-9]{4}')

HERE = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(HERE, 'labextension', 'package.json')) as fid:
    data = json.load(fid)


class SparkMonitorHandler(JupyterHandler):

    @tornado.web.authenticated
    async def get(self):
        """
        Handles get requests to the Spark UI
        Fetches the Spark Web UI from the configured ports
        """
        # Grab base_url and port to get full url
        baseurl = os.environ.get("SPARKMONITOR_UI_HOST", "127.0.0.1")
        port_match = PORT_PARSE.findall(self.request.uri)
        port = "4040" if not port_match else port_match[0]
        url = "http://" + baseurl + ':' + port

        proxy_root_path = PROXY_ROOT_BASE[:-1]

        print("SPARKMONITOR_SERVER: Request URI: " + self.request.uri)
        print("SPARKMONITOR_SERVER: Getting from " + url)

        request_path = self.request.uri[(self.request.uri.index(proxy_root_path) + len(proxy_root_path)):]
        # Remove the /port (ie /4040, /4041 etc) from the request path because
        # this is the path to the static js
        request_path = request_path.replace(f"/{port}", "")

        self.request_root_url = \
            self.request.uri[:self.request.uri.index(proxy_root_path) + len(proxy_root_path)] + "/" + port
        print('SPARKMONITOR_SERVER: Request_path ' +
              request_path + ' \n Replace_path:' + self.request_root_url)

        backend_url = os.path.join(url, request_path)
        self.debug_url = url
        self.backendurl = backend_url

        print('SPARKMONITOR_SERVER: backend_url: ' + self.backendurl)
        print('SPARKMONITOR_SERVER: debug_url: ' + self.debug_url)

        http = httpclient.AsyncHTTPClient()
        try:
            response = await http.fetch(backend_url)
        except Exception as e:
            print('SparkMonitor: Spark UI Error ', e)
        else:
            self.handle_response(response)

    def handle_response(self, response):
        """Sends the fetched page as response to the GET request"""
        if response.error:
            content_type = 'application/json'
            content = json.dumps({'error': 'SPARK_UI_NOT_RUNNING',
                                  'url': self.debug_url,
                                  'backendurl': self.backendurl,
                                  'replace_path': self.request_root_url})
            print('SPARKMONITOR_SERVER: Spark UI not running')
        else:
            content_type = response.headers['Content-Type']
            if 'text/html' in content_type:
                content = substitute_proxy_links(response.body, self.request_root_url)
            elif 'javascript' in content_type:
                body = "location.origin +'" + self.request_root_url + "' "
                content = response.body.replace(
                    b'location.origin', body.encode())
            else:
                # Probably binary response, send it directly.
                content = response.body
        self.set_header('Content-Type', content_type)
        self.write(content)
        self.finish()


def substitute_proxy_links(content, root_url):
    """Replace all the links with our prefixed handler links,
     e.g.:
    /proxy/application_1467283586194_0015/static/styles.css" or
    /static/styles.css
    with
    /spark/static/styles.css
    """
    soup = BeautifulSoup(content, BEAUTIFULSOUP_BUILDER)
    for tags, attribute in PROXY_ATTRIBUTES:
        for tag in soup.find_all(tags, **{attribute: True}):
            value = tag[attribute]
            match = PROXY_PATH_RE.match(value)
            if match is not None:
                value = match.groups()[0]
            tag[attribute] = os.path.join(root_url, value)
    return str(soup)


def _jupyter_labextension_paths():
    return [{
        'src': 'labextension',
        'dest': data['name']
    }]


def _jupyter_server_extension_points():
    return [{"module": "jupyterlab_spark"}]


def _load_jupyter_server_extension(server_app):
    """
    Called when the Jupyter server extension is loaded.
    Args:
        server_app (NotebookWebApplication): handle to the
        Notebook webserver instance.
    """
    route_pattern = PROXY_ROOT_BASE + '.*'
    spark_monitor_handlers = [
        (route_pattern, SparkMonitorHandler),
    ]
    server_app.web_app.add_handlers(".*$", spark_monitor_handlers)
