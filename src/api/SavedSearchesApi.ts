import { APIRequestContext, expect } from '@playwright/test';

/** Shape of a saved search as returned by GET /savedSearches (only the fields we use). */
export interface SavedSearch {
  _id: string;
  name: string;
  data: { text?: string; [key: string]: unknown };
  nodes?: SavedSearch[];
}

/**
 * Thin client for the saved-searches endpoints the web app itself uses
 * (found in DevTools while exploring):
 *   GET    /savedSearches            -> { nodes: SavedSearch[] } (tree)
 *   POST   /savedSearches            -> 201 created
 *   PUT    /savedSearches/:id/rename -> 200
 *   DELETE /savedSearches/:id        -> 200
 *
 * Used for fast test setup, for checking what was really stored,
 * and for cleanup — so UI tests only drive the UI they are testing.
 */
export class SavedSearchesApi {
  constructor(private readonly request: APIRequestContext) {}

  async list(): Promise<SavedSearch[]> {
    const response = await this.request.get('/savedSearches');
    expect(response.status(), 'GET /savedSearches').toBe(200);
    const body = (await response.json()) as { nodes: SavedSearch[] };
    return flatten(body.nodes);
  }

  async findByName(name: string): Promise<SavedSearch | undefined> {
    return (await this.list()).find((s) => s.name === name);
  }

  async create(name: string, text: string): Promise<SavedSearch> {
    const response = await this.request.post('/savedSearches', {
      data: { name, data: { text }, shared: true },
    });
    expect(response.status(), `POST /savedSearches "${name}"`).toBe(201);
    return (await response.json()) as SavedSearch;
  }

  async delete(id: string): Promise<void> {
    const response = await this.request.delete(`/savedSearches/${id}`);
    expect([200, 404], `DELETE /savedSearches/${id}`).toContain(response.status());
  }

  /** Removes every saved search whose name starts with the prefix (test cleanup). */
  async deleteByPrefix(prefix: string): Promise<void> {
    const leftovers = (await this.list()).filter((s) => s.name.startsWith(prefix));
    for (const search of leftovers) {
      await this.delete(search._id);
    }
  }
}

function flatten(nodes: SavedSearch[] = []): SavedSearch[] {
  return nodes.flatMap((node) => [node, ...flatten(node.nodes)]);
}
