# Codefort default theme.

Download as .zip and upload to your shop.

This theme will be uploaded to all newly created shops.


## Compiling TailwindCSS

**1. Install required npm dependencies**
``` bash
$ npm install
```

**2. Compile and minify**
``` bash
$ npx tailwindcss build assets/tailwind.css -o assets/tailwind.min.css && cleancss -o assets/tailwind.min.css assets/tailwind.min.css
```