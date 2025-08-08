/**
 * CosenseWebSocketClient のモック実装
 */
export class CosenseWebSocketClient {
	constructor(credentials: any) {}

	async createPage(projectName: string, title: string, content: string): Promise<void> {
		// モック実装 - 何もしない
		return Promise.resolve();
	}

	async insertLines(projectName: string, title: string, lineNumber: number, text: string): Promise<void> {
		// モック実装 - 何もしない
		return Promise.resolve();
	}
}