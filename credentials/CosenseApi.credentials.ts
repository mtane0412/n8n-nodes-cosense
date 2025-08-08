/**
 * Cosense API認証情報の定義
 * プロジェクト名とセッションIDを保存する
 */
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CosenseApi implements ICredentialType {
	name = 'cosenseApi';
	displayName = 'Cosense API';
	documentationUrl = 'https://scrapbox.io/scrapboxlab/UserScript%E3%81%A7%E5%A4%96%E9%83%A8API%E3%81%AB%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E3%81%99%E3%82%8B';
	properties: INodeProperties[] = [
		{
			displayName: 'Project Name',
			name: 'projectName',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'my-project',
			description: 'The name of your Cosense/Scrapbox project',
		},
		{
			displayName: 'Session ID (connect.sid)',
			name: 'sessionId',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: false,
			placeholder: 's%3A...',
			description: 'Session ID for authentication. Required for private pages and write operations. You can get this from your browser cookies.',
		},
	];
}