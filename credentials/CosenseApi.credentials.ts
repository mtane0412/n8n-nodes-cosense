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
			displayName: 'Authentication Type',
			name: 'authenticationType',
			type: 'options',
			options: [
				{
					name: 'Session Cookie',
					value: 'sessionCookie',
					description: 'Use connect.sid cookie for full access (read/write)',
				},
				{
					name: 'Service Account',
					value: 'serviceAccount',
					description: 'Use Service Account key for read-only access (Business Plan only)',
				},
			],
			default: 'sessionCookie',
			description: 'Choose the authentication method',
		},
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
			displayOptions: {
				show: {
					authenticationType: ['sessionCookie'],
				},
			},
		},
		{
			displayName: 'Service Account Access Key',
			name: 'serviceAccountKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: false,
			placeholder: 'your-service-account-key',
			description: 'Service Account Access Key for read-only access. Available in Business Plan only.',
			displayOptions: {
				show: {
					authenticationType: ['serviceAccount'],
				},
			},
		},
	];
}