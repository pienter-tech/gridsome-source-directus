# gridsome-source-directus

I created this script for personal use before [peXed](https://github.com/peXed) published his [gridsome-source-directus](https://github.com/peXed/gridsome-source-directus).
Because it has a slightly different approach I decided to publish this package anyway.

## Features

- Automatically gets all collections.
- Automatically adds references for files.
- Automatically adds references for relations.
- Optionally set up routes,
- Optionally make all field names camel case,

## Install

- `yarn add @pienter/gridsome-source-directus`
- `npm install @pienter/gridsome-source-directus`

## Usage

Add the plugin to your gridsome.config.js file.

### Options:

- url (required): Directus API root url.
- project (optional | '\_'): Directus project

| Name      | Required | Type    | Default | Description                                                                                                                                                                                                |
| --------- | -------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| url       | true     | string  | /       | Directus API root url ([see here for more info](https://docs.directus.io/api/reference.html#project-prefix))                                                                                               |
| project   | false    | string  | `'\_'`  | Directus project prefix                                                                                                                                                                                    |
| token     | false    | string  | `''`    | Directus static token ([see here for more info](https://docs.directus.io/api/reference.html#tokens)), use either token or email/password                                                                   |
| email     | false    | string  | `''`    | Directus user email                                                                                                                                                                                        |
| password  | false    | string  | `''`    | Directus user password                                                                                                                                                                                     |
| camelCase | false    | boolean | `true`  | Transform field names to camel case                                                                                                                                                                        |
| routes    | false    | object  | `{}`    | Add route option to content type, object where `key` is the `collection` and the `value` is the `route` ([see here for more info](https://gridsome.org/docs/data-store-api#add-a-content-type-collection)) |

### Example config:

```js
module.exports = {
  plugins: [
    {
      use: '@pienter/gridsome-source-directus',
      options: {
        url: 'https://directus.api.url',
        project: '_',
        email: 'directus@user.something',
        password: 'USERPASSWORD',
        camelCase: false,
        routes: {
          posts: 'posts/:year/:slug',
        },
      },
    },
  ],
};
```
