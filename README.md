# KiboChat

## Operations Guide

#### Setup Nodejs and NPM

You should have Nodejs and NPM installed on your system.

#### Install Forever

To install forever run the following command:

    npm install forever -g

#### Install Git

    sudo apt-get update
    sudo apt-get install git

#### Clone

Now, clone the project:

    git clone https://github.com/Cloudkibo/KiboChat/

#### Redirect the ports to our application ports
Run following two commands

    iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
    iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 8443

Now on terminal, set the environment variables in /etc/environment.

    nano /etc/environment

We need to set the following variables: (Just copy paste and then change the values)

    NODE_ENV=production
    FACEBOOK_ID=<YOUR FB ID>
    FACEBOOK_SECRET=<YOUR FB SECRET>
    DOMAIN=<YOUR DOMAIN>

Now, run the following command to install dependencies:

    npm install

#### Shopify Super Number Plugins

Shopify Super Number plugin code is built using webpack. It has been written in ES6 modules so a bundler like webpack will bundle them into one single file that we can send to shopify as a script file.

Please run following build command whenever you do any change in Shopify plugin files in directory `server/api/v1.1/shopify/script`

    npm run build

This will build the final shopify script that is being served to Shopify. In order to run the above script on production server, first install the webpack on production server. (This is done one time only when setting up new production droplet):

    npm install -g webpack
    npm install -g webpack-cli

When working in development mode, instead of doing `npm run build` each time you make change, just run the following command to start the file watcher of webpack.

    npm run start:shopify:watch

This will keep building automatically based on your changes in widget script files.