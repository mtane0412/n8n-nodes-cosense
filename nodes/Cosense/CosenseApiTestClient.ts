/**
 * Cosense APIテストクライアント
 * 統合テスト用のスタンドアロンクライアント
 */

import type { JsonObject } from 'n8n-workflow';

export interface TestCredentials {
	authType: 'sessionCookie' | 'serviceAccount';
	projectName: string;
	sessionId?: string;
	serviceAccountKey?: string;
}

export class CosenseApiTestClient {
	private baseUrl = 'https://scrapbox.io/api';
	private projectName: string;
	private headers: Record<string, string>;

	constructor(credentials: TestCredentials) {
		this.projectName = credentials.projectName;
		this.headers = {
			'User-Agent': 'n8n-nodes-cosense/0.1.0',
		};

		if (credentials.authType === 'sessionCookie' && credentials.sessionId) {
			this.headers['Cookie'] = `connect.sid=${credentials.sessionId}`;
		} else if (credentials.authType === 'serviceAccount' && credentials.serviceAccountKey) {
			this.headers['x-service-account-access-key'] = credentials.serviceAccountKey;
		}
	}

	private async makeRequest(method: string, endpoint: string, body?: any): Promise<any> {
		const url = `${this.baseUrl}${endpoint}`;
		const options: RequestInit = {
			method,
			headers: {
				...this.headers,
				'Content-Type': 'application/json',
			},
		};

		if (body) {
			options.body = JSON.stringify(body);
		}

		const response = await fetch(url, options);
		const text = await response.text();

		if (!response.ok) {
			if (response.status === 404) {
				throw new Error('Page not found');
			} else if (response.status === 401) {
				throw new Error('Authentication failed');
			} else if (response.status === 409) {
				throw new Error('Page already exists');
			}
			throw new Error(`HTTP ${response.status}: ${text}`);
		}

		return text ? JSON.parse(text) : {};
	}

	async getPage(params: { title: string }): Promise<JsonObject> {
		const encodedTitle = encodeURIComponent(params.title);
		return this.makeRequest('GET', `/pages/${this.projectName}/${encodedTitle}`);
	}

	async listPages(params: { limit: number; skip?: number }): Promise<{ pages: JsonObject[] }> {
		const queryParams = new URLSearchParams({
			limit: params.limit.toString(),
			skip: (params.skip || 0).toString(),
		});
		const response = await this.makeRequest('GET', `/pages/${this.projectName}?${queryParams}`);
		return { pages: response.pages || [] };
	}

	async searchPagesByTitle(params: { query: string; limit?: number }): Promise<{ pages: JsonObject[] }> {
		const queryParams = new URLSearchParams({
			q: params.query,
			limit: (params.limit || 50).toString(),
		});
		const response = await this.makeRequest('GET', `/pages/${this.projectName}/search/titles?${queryParams}`);
		return { pages: response.pages || [] };
	}

	async searchPagesByQuery(params: { query: string; limit?: number }): Promise<{ pages: JsonObject[] }> {
		const queryParams = new URLSearchParams({
			q: params.query,
			limit: (params.limit || 50).toString(),
		});
		const response = await this.makeRequest('GET', `/pages/${this.projectName}/search/query?${queryParams}`);
		return { pages: response.pages || [] };
	}

	async createPage(params: { title: string; body: string }): Promise<JsonObject> {
		const encodedTitle = encodeURIComponent(params.title);
		return this.makeRequest('POST', `/pages/${this.projectName}/${encodedTitle}`, {
			body: params.body,
		});
	}

	async insertLines(params: { title: string; lineNumber: number; text: string }): Promise<JsonObject> {
		const encodedTitle = encodeURIComponent(params.title);
		const page = await this.getPage({ title: params.title });
		const lines = (page.lines as string[]) || [];
		
		// 行を挿入
		const newLines = [...lines];
		newLines.splice(params.lineNumber, 0, ...params.text.split('\n'));
		
		return this.makeRequest('POST', `/pages/${this.projectName}/${encodedTitle}`, {
			body: newLines.join('\n'),
		});
	}
}