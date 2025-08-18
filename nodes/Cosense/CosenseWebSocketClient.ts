/**
 * Cosense WebSocketクライアント - WebSocketベースの書き込み操作を提供
 */
// @ts-ignore
import { patch } from '@cosense/std/esm/websocket/patch.js';
// @ts-ignore
import type { BaseLine } from '@cosense/types/rest';

export interface WebSocketCredentials {
	sessionId: string;
}

export class CosenseWebSocketClient {
	private sessionId: string;

	constructor(credentials: WebSocketCredentials) {
		this.sessionId = credentials.sessionId;
	}

	async createPage(projectName: string, title: string, content: string): Promise<void> {
		const lines = content.split('\n');
		
		const result = await patch(projectName, title, () => {
			// ページのタイトルを最初の行として、残りの内容を続く行として返す
			return [title, ...lines];
		}, {
			sid: this.sessionId,
		});

		if (result.ok === false) {
			const error = result.err;
			if (typeof error === 'object' && 'name' in error && error.name === 'UnexpectedRequestError') {
				throw new Error(`WebSocket connection failed. Please check your session ID is valid and not expired.`);
			}
			throw new Error(`Failed to create page: ${JSON.stringify(error)}`);
		}
	}

	async insertLines(projectName: string, title: string, lineNumber: number, text: string): Promise<void> {
		const newLines = text.split('\n');
		
		const result = await patch(projectName, title, (lines: BaseLine[]) => {
			const textLines = lines.map(line => line.text);
			// 指定された行番号に新しい行を挿入
			const updatedLines = [
				...textLines.slice(0, lineNumber),
				...newLines,
				...textLines.slice(lineNumber)
			];
			return updatedLines;
		}, {
			sid: this.sessionId,
		});

		if (result.ok === false) {
			const error = result.err;
			if (typeof error === 'object' && 'name' in error && error.name === 'UnexpectedRequestError') {
				throw new Error(`WebSocket connection failed. Please check your session ID is valid and not expired.`);
			}
			throw new Error(`Failed to insert lines: ${JSON.stringify(error)}`);
		}
	}
}