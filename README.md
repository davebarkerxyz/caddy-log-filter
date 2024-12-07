# Caddy Log Filter

A tiny [Deno](https://deno.com) (JavaScript) log server to filter access logs from [Caddy](http://caddyserver.com), logging only the attributes that you choose.

## Why?

Caddy has a very robust, verbose [logging](https://caddyserver.com/docs/logging) system which outputs structured (JSON) logs by default. However, it includes way too much information for many use cases. Due to limitations in the [Zap](https://github.com/uber-go/zap) logging framework that Caddy uses, it's [not possible](https://caddy.community/t/include-fields-in-log-instead-of-delete/18362) to log only the fields you're interested in - you've got to exclude the fields you don't care about. This makes it too easy to accidentally log sensitive information.

Caddy Log Filter lets you log only the fields you're interested in, and will automatically strip the query string from the URI by default before persisting anything to disk.

## How does it work?

Caddy Log Filter is a very small [Deno](https://deno.com) (JavaScript) TCP server that listens for JSON logs sent from the Caddy [net](https://caddyserver.com/docs/caddyfile/directives/log#net) log output module and records only the fields we want.

## Dependencies

Caddy Log Filter requires [Deno](https://deno.com).

## License

MIT

## Usage

### Quick start

`deno -A log-filter.js`

By default, Caddy Log Filter will write its output to *stdout*. To write to a log file, specify the *LOG_FILE* environment variable.

By default, it listens on port 9919 on 127.0.0.1 only. You can specify *PORT* and *HOST* environment variables to customise this behaviour.

Caddy Log Filter requires the network access permission (to create the server socket), environment variable access (to read the PORT, HOST and LOG_FILE environment variables), and read/write access (to write to the log file, if specified).

### Advanced (more secure) usage

To specify the listen port and host, write the log output to a file, and restrict permissions to only those needed, you can run it as follows:

```
PORT=8080 HOST=0.0.0.0 LOG_FILE=logs/access.log deno -A log-filter.js --allow-net --allow-env --allow-read=logs/ --allow-write=logs/
```

### Caddy configuration

Once Caddy Log Filter is running, you need to configure Caddy to output its logs to a network socket. Assuming you are running the log filter on port 9919 on the same host, a suitable Caddyfile might look like:

```
http://localhost {
    encode gzip
    root * site/
    file_server
    log {
        output net localhost:9919 {
            soft_start
        }
    }
}
```

### Docker Compose

The best way to run Caddy Log Filter is by adding it as a service to your Caddy docker-compose.yml file. An example is provided in [example/docker-compose.yml](example/docker-compose.yml).

The example assumes that *log-filter.js* lives a level above your *docker-compose.yml* file, so you may need to adjust the path as necessary.

## Performance

There's minimal impact on Caddy server performance when using Caddy Log Filter, based on simple benchmarking of a static site using [go-wrk](https://github.com/tsliwowicz/go-wrk).

Running the benchmark for 10 seconds yielded the following results on my M1 MacBook Pro listening locally:

||Without Logging|With Logging|
|-|-|-|
|Requests|346,533|302,866|
|Requests/sec|34,867.11|30,451.88|
|Transfer/sec|17.12MB|14.96MB|
|Overall Requests/sec|34,646.45|30,279.20|
|Overall Transfer/sec|17.02MB|14.87MB
|Fastest Request|100µs|109µs|
|Avg Req Time|286µs|327µs|
|Slowest Request|31.12ms|9.288ms|
|Number of Errors|0|0|

In my case, an average response time of 327µs (that's 0.327ms, or 0.000327) when logging is acceptable. This benchmark was carried out against a simple (and very small) static site. In all likelihood, a more complex site would see the bottleneck occur in serving the page (e.g. from a reverse proxy) and not in logging the request.

## Security

Caddy Log Filter accepts logs from any client that can connect (because Caddy's net log output module has no authentication ability) so **it's important to make sure it can only be contacted from trusted hosts**.

One way to do this is to run it inside a docker compose network with no ports exposed, so it can only be accessed by other containers on that network. Alternatively, either bind to localhost (on a secure machine where no other processes will write to log filter's port) or use your operating system's firewall (e.g. iptables or nftables) to limit access to trusted hosts.

## Known issues

After starting Caddy and log-filter, the very first request received by Caddy isn't always logged. I suspect this may be a side effect of the `soft-start` directive in Caddy. If capturing the first request is important, you may want to `curl` your site on restart to trigger the first request (and connection to the logging server).
