/**
 * @cosense/std/websocket のモック
 */

export interface PatchResult {
	ok: boolean;
	err?: any;
}

export const patch = jest.fn().mockImplementation(
	async (projectName: string, title: string, updateFn: Function, options: any): Promise<PatchResult> => {
		// モック実装 - 常に成功を返す
		return { ok: true };
	}
);