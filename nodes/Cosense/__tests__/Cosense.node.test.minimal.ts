/**
 * Cosenseノードの最小限のユニットテスト
 */
import { Cosense } from '../Cosense.node';

// CosenseWebSocketClientをモック
jest.mock('../CosenseWebSocketClient');

// CosenseApiClientをモック
jest.mock('../CosenseApiClient');

describe('Cosense Node - Minimal Tests', () => {
	let mockExecuteFunctions: any;
	let cosenseNode: Cosense;

	beforeEach(() => {
		// モックの初期化
		mockExecuteFunctions = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				projectName: 'test-project',
				sessionId: 'test-session-id',
			}),
			continueOnFail: jest.fn().mockReturnValue(false),
			getNode: jest.fn().mockReturnValue({ 
				id: 'test-node-id',
				name: 'Cosense',
				type: 'cosense',
				typeVersion: 1,
				position: [0, 0],
				parameters: {}
			}),
			helpers: {
				httpRequest: jest.fn(),
			},
		};

		cosenseNode = new Cosense();
		
		// モックをリセット
		jest.clearAllMocks();
	});

	test('should execute without errors', async () => {
		// 最小限の設定
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('page') // resource (i=0)
			.mockReturnValueOnce('get') // operation (i=0)  
			.mockReturnValueOnce('test-project') // projectName (i=0)
			.mockReturnValueOnce('Test Page'); // pageTitle (i=0)

		// CosenseApiClientのモック
		const { CosenseApiClient } = require('../CosenseApiClient');
		CosenseApiClient.mockImplementation(() => ({
			getPage: jest.fn().mockResolvedValue({
				title: 'Test Page',
				lines: ['line1', 'line2'],
			}),
		}));

		// 実行
		const result = await cosenseNode.execute.call(mockExecuteFunctions);

		// 基本的な検証
		expect(result).toBeDefined();
		expect(result[0]).toBeDefined();
		expect(result[0][0]).toHaveProperty('json');
		expect(result[0][0].json).toHaveProperty('title', 'Test Page');
	});

	test('should handle errors with continueOnFail', async () => {
		// continueOnFailをtrueに設定
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		// エラーを返すように設定
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('page') // resource (i=0)
			.mockReturnValueOnce('get') // operation (i=0)
			.mockReturnValueOnce('test-project') // projectName (i=0)
			.mockReturnValueOnce('Error Page'); // pageTitle (i=0)

		// CosenseApiClientのモック
		const { CosenseApiClient } = require('../CosenseApiClient');
		CosenseApiClient.mockImplementation(() => ({
			getPage: jest.fn().mockRejectedValue(new Error('Test error')),
		}));

		// 実行
		const result = await cosenseNode.execute.call(mockExecuteFunctions);

		// エラーハンドリングの検証
		expect(result).toBeDefined();
		expect(result[0]).toBeDefined();
		expect(result[0][0]).toHaveProperty('json');
		expect(result[0][0].json).toHaveProperty('error', 'Test error');
		expect(result[0][0]).toHaveProperty('error');
	});
});