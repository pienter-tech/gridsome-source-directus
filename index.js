const DirectusSDK = require('@directus/sdk-js');
const camelCase = require('camelcase');
const camelCaseKeys = require('camelcase-keys');

class DirectusSource {
  static defaultOptions() {
    return {
      url: '',
      project: '_',
      email: '',
      password: '',
      token: '',
      camelCase: true,
      shallowCamelCase: false,
      pascalTypes: true,
      routes: {},
      debug: false,
    };
  }

  constructor(api, options) {
    this.options = options;
    api.loadSource(store => this.fetchContent(store));
  }

  async login() {
    console.log('Directus 1. Login in');
    const {
      url,
      project,
      email,
      password,
      token
    } = this.options;

    if (!(url && (token || (email && password)))) {
      console.error(
        '### Woops could not log in, please provide credentials ###'
      );
      throw 'Directus failed: no credentials found.';
    }

    const directusOptions = {
      url,
      project,
      token,
    };
    const directusClient = new DirectusSDK(directusOptions);

    if (email && password) {
      try {
        await directusClient.login({
          email,
          password,
          persist: false,
        });
      } catch (e) {
        console.error('### Woops could not log in ###');
        console.error(e);
        throw 'Directus failed: Could not log in.';
      }
    }

    return directusClient;
  }

  async getCollections() {
    const collections = await this.directusClient.getCollections();
    return collections.data.filter(
      collection => !collection.collection.startsWith('directus_')
    ).map(collection => {
      collection.originalCollection = collection.collection;
      if (this.options.pascalTypes) {
        collection.collection = camelCase(collection.collection, {
          pascalCase: true
        });
      }
      return collection;
    });
  }

  transformItem(item, idToString = true) {
    const gridsomeFields = {
      id: idToString ? String(item.id) : item.id
    }

    const _item = this.options.camelCase ?
      camelCaseKeys(item, {
        deep: !this.options.shallowCamelCase
      }) :
      item;

    return {
      ..._item,
      ...gridsomeFields
    }
  }

  static getFileFields({
    fields
  }) {
    return Object.values(fields).filter(field => field.type === 'file');
  }

  async getItems(collection) {
    const items = await this.directusClient.getItems(collection.originalCollection, {
      limit: '-1',
    });
    return items.data.map(item => this.transformItem(item));
  }

  async getCollectionsWithItems() {
    console.log('Directus 2. Getting collections');
    const collections = await this.getCollections();
    for (let index = 0; index < collections.length; index++) {
      if (this.options.debug) {
        console.log(collections[index]);
      }

      try {
        console.log(
          `Directus 2.${index} Getting items for ${
            collections[index].collection
          }`
        );
        const items = await this.getItems(collections[index]);
        collections[index]['items'] = items;
        collections[index]['fileFields'] = DirectusSource.getFileFields(
          collections[index]
        );

        if (this.options.debug) {
          console.log(items);
          console.log(DirectusSource.getFileFields(collections[index]));
        }
      } catch (e) {
        console.error(
          `### Could not get items for ${collections[index].collection} ###`
        );
        console.error(e);
        return [];
      }
    }
    return collections;
  }

  transformRelation(relation) {
    const changes = {
      field_many: !!relation.field_many ? (this.options.camelCase ? camelCase(relation.field_many) : relation.field_many) : 'id',
    };
    if (this.options.pascalTypes) {
      changes.collection_many = camelCase(relation.collection_many, {
        pascalCase: true
      });
      changes.collection_one = camelCase(relation.collection_one, {
        pascalCase: true
      });
    }

    return {
      ...relation,
      ...changes
    }
  }

  async getRelations() {
    try {
      console.log('Directus 3. Getting relations');
      const relationsData = await this.directusClient.getRelations({
        filter: {
          collection_many: {
            nlike: 'directus_'
          }
        },
      });

      if (this.options.debug) {
        console.log(relationsData.data);
      }

      return relationsData.data.map(relation => this.transformRelation(relation));
    } catch (e) {
      console.error('### Could not get relations ###');
      console.error(e);
      return [];
    }
  }

  async getAllFiles() {
    try {
      console.log('Directus 4. Getting files');
      const filesData = await this.directusClient.get('files', {
        limit: '-1'
      });

      if (this.options.debug) {
        console.log(filesData.data);
      }

      return filesData.data;
    } catch (e) {
      console.error('### Could not get files ###');
      console.error(e);
      return [];
    }
  }

  async fetchContent(store) {
    this.directusClient = await this.login();
    const collections = await this.getCollectionsWithItems();
    const relations = await this.getRelations();
    const files = await this.getAllFiles();

    let contentTypes = {};

    console.log('Directus 5. Setting up GraphQL Schema');
    contentTypes['Files'] = store.addContentType({
      typeName: 'Files',
    });

    collections.forEach(collection => {
      const contentType = {
        typeName: collection.collection,
      };

      if (this.options.routes.hasOwnProperty(collection.collection)) {
        contentType.route = this.options.routes[collection.collection];
      }

      contentTypes[collection.collection] = store.addContentType(contentType);
      collection.fileFields.forEach(fileField => {
        contentTypes[collection.collection].addReference(
          fileField.field,
          'Files'
        );
      });
    });

    relations.forEach(relation => {
      contentTypes[relation.collection_many].addReference(
        relation.field_many ? camelCase(relation.field_many) : 'id',
        relation.collection_one
      );
    });

    files.forEach(file => {
      const fileItem = this.transformItem(file, false);
      contentTypes['Files'].addNode(fileItem);
    });

    collections.forEach(collection => {
      collection.items.forEach(item => {
        contentTypes[collection.collection].addNode(item);
      });
    });
  }
}

module.exports = DirectusSource;