// 1. Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content';

// 2. Define GraphQL query function
const fetchGraphQL = async (query: string, variables: Record<string, any> = {}) => {
  const endpoint = import.meta.env.CF_ENDPOINT;
  if (!endpoint) throw new Error('CF_ENDPOINT environment variable is required');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
};

// 3. Define your collection(s)
const articles = defineCollection({
  loader: async () => {
    const query = `
      query ArticleByPath($path: String!) {
        component: articleByPath(
          _path: $path
          _assetTransform: {format: WEBP, width: 1900, preferWebp: true}
        ) {
          item {
            __typename
            _path
            _metadata {
              stringMetadata {
                name
                value
              }
            }
            title
            pubDate
            asset {
              ... on ImageRef {
                __typename
                _authorUrl
                _dynamicUrl
                mimeType
                width
                height
              }
            }
            content {
              html
              plaintext
              json
            }
          }
        }
      }
    `;

    const result = await fetchGraphQL(query, { path: '/' });
    
    if (result.errors) {
      throw new Error(`GraphQL Error: ${result.errors[0].message}`);
    }

    return result.data.component.item.map((article: any) => ({
      id: article._path,
      title: article.title,
      pubDate: article.pubDate,
      heroImage: article.asset?._dynamicUrl || '',
      content: article.content.html,
      metadata: article._metadata.stringMetadata.reduce((acc: any, curr: any) => {
        acc[curr.name] = curr.value;
        return acc;
      }, {}),
    }));
  },
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    heroImage: z.string(),
    content: z.string(),
    metadata: z.record(z.string()).optional(),
  })
});

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    heroImage: z.string(),
    content: z.string(),
  })
});

// 4. Export a single `collections` object to register your collection(s)
export const collections = { articles, blog };