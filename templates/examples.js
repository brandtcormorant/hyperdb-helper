import dedent from 'string-dedent'

export const schemaFileTemplate = (content = {}) => {
  return dedent`
    export function createSchema (hyperschema) {
      const schema = hyperschema.namespace('example')

      schema.register({
        name: 'post',
        fields: [
          {
            name: 'id',
            type: 'string',
            required: true
          },
          {
            name: 'type',
            type: 'string',
            required: true
          },
          {
            name: 'author',
            type: 'string',
            required: true
          },
          {
            name: 'created',
            type: 'uint',
            required: true
          },
          {
            name: 'title',
            type: 'string',
            required: true
          },
          {
            name: 'content',
            type: 'string',
            required: true
          },
        ]
      })

      schema.register({
        name: 'author',
        fields: [
          {
            name: 'id',
            type: 'string',
            required: true
          },
          {
            name: 'username',
            type: 'string',
            required: true
          }
        ]
      })

      return hyperschema
    }

    export function createDatabase (hyperdb) {
      const database = hyperdb.namespace('example')

      // Collections
      database.collections.register({
        name: 'post',
        schema: '@example/post',
        key: ['id']
      })

      database.collections.register({
        name: 'author',
        schema: '@example/author',
        key: ['id']
      })

      // Indexes
      database.indexes.register({
        name: 'by_title',
        collection: '@example/post',
        key: ['title'],
        unique: true
      })

      database.indexes.register({
        name: 'by_type',
        collection: '@example/post',
        key: ['type']
      })

      database.indexes.register({
        name: 'by_author',
        collection: '@example/post',
        key: ['author']
      })

      database.indexes.register({
        name: 'by_username',
        collection: '@example/author',
        key: ['username'],
        unique: true
      })

      return database
    }
  `
}

export const functionFileTemplate = () => {
  return dedent`
    export function mapExample (record, context) {
      return [record.id]
    }

    export async function triggerExample (db, key, record, context) {
      return record
    }
  `
}

export const exampleIndexFileTemplate = ({ relativePath, moduleType }) => {
  const content = `
    await db.ready()

    // Create an author
    const author = {
      id: 'author-1',
      username: 'alice'
    }
    await db.insert('@example/author', author)

    const author2 = {
      id: 'author-2',
      username: 'bob'
    }

    await db.insert('@example/author', author2)

    // Create some posts
    const posts = [
      {
        id: 'post-1',
        type: 'blog',
        author: author.id,
        created: Date.now(),
        title: 'My First Post',
        content: 'Hello world!'
      },
      {
        id: 'post-2',
        type: 'tutorial',
        author: author.id,
        created: Date.now(),
        title: 'How to Use Hyperdb',
        content: 'Step 1...'
      },
      {
        id: 'post-3',
        type: 'tutorial',
        author: author2.id,
        created: Date.now(),
        title: 'How to Use Hyperbee',
        content: 'Step 1...'
      },
      {
        id: 'post-4',
        type: 'rant',
        author: author2.id,
        created: Date.now(),
        title: 'On the State of the World Today and Why I Hate It So Much and You Should Too and Here is Why',
        content: '...'
      }
    ]

    for (const post of posts) {
      await db.insert('@example/post', post)
    }

    // Query examples

    // Find all posts by a specific author
    const postsByAuthor = db.find('@example/by_author', {
      gte: { author: author.id },
      lte: { author: author.id }
    })

    // Get rid of those rants 😅
    const tutorialPosts = db.find('@example/by_type', {
      gte: { type: 'tutorial' },
      lte: { type: 'tutorial' }
    })

    // Find a post by its title
    const postByTitle = await db.get('@example/by_title', {
      title: 'My First Post'
    })

    console.log('Posts by author:', await postsByAuthor.toArray())
    console.log('Tutorials:', await tutorialPosts.toArray())
    console.log('Post by title:', postByTitle)

  `

  if (moduleType === 'commonjs') {
    return dedent`
      const Hyperdb = require('hyperdb')
      const Corestore = require('corestore')

      const definitions = require('./${relativePath}')

      const store = new Corestore('./.corestore')
      const core = store.get({ name: 'example' })
      const db = Hyperdb.bee(core, definitions)

      async function main () {
        ${content}
      }

      main().catch(console.error)
    `
  }

  return dedent`
    import Hyperdb from 'hyperdb'
    import Corestore from 'corestore'

    import definitions from './${relativePath}'

    const store = new Corestore('./.corestore')
    const core = store.get({ name: 'example' })
    const db = Hyperdb.bee(core, definitions)

    ${content}
  `
}
