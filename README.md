## Backend Collector for Client-Side Data

### Getting Started
* Install with Node.js package manager [npm](http://npmjs.org/):

        $ npm install

* Configure your collector server HTTP/HTTPS ports and SSL certs by changing HTTP_PORT, HTTPS_PORT, and SSL_OPTS variables at the top of server.js file.
	
	This configuration step can be skipped for **test & dev purposes**. By default, the server binds to ports 3000 and 4443 for HTTP/HTTPS traffic. It also uses self-signed certificates for SSL under `.ssl/` directory, so we recommend you replace them with real certificates for a secure production solution.

* Start the collector server by typing:

		$ node server.js
		
	If you have configured server ports to standard ports 80 and 443, you'll need to `sudo node server.js` to start the server as root unless you have rights to bind to privileged ports < 1024
	
	You should see something similar to:

    	Listening to HTTP on port 3000
    	Listening to HTTPS on port 4443

That's it!
