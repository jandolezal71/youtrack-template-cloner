import {Issue, Youtrack } from 'youtrack-rest-client';
import { Command } from 'commander';
import chalk from 'chalk';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

type Options = {
	token: string;
	url: string;
	templateIssueId: string;
}

async function prepare ({ templateIssueId, token, url }: Options) {
	const youtrack = new Youtrack({
		baseUrl: url,
		token: token,
	});

	function cloneIssue (issue: Issue) {
		return youtrack.issues.create({
			summary: (issue.summary || '').replace(' - Šablona', ''),
			tags: issue.tags?.filter(({ name }) => !['Šablona', 'Template'].includes(name)),
			// @ts-ignore
			project: issue.project,
			description: issue.description,
			fields: issue.fields
		})
	}


	let templateIssue: Issue | undefined;

	try {
		templateIssue = await youtrack.issues.byId(templateIssueId);
	}
	catch (error) {
	    if (error.statusCode !== 404) {
	    	throw error;
		}
	}

	// Must be on next block, because of TLS_REJECT warning
	process.stdout.write('Searching for issue in youtrack... ');

	if (!templateIssue) {
		console.log(chalk.bgRed('NOT FOUND'));

		process.exit(1);
	}

	console.log(chalk.bgGreen('OK'));

	process.stdout.write('Check if the issue has "Template" tag... ');

	if (!templateIssue.tags?.some(({ name }) => name === 'Template')) {
		console.log(chalk.bgGreen('NO'));

		process.exit(1);
	}

	console.log(chalk.bgGreen('OK'));

	const projectId = templateIssueId.split('-')[0];

	if (templateIssue?.id) {
		process.stdout.write('Cloning parent issue... ');

		const parentIssue = await cloneIssue(templateIssue);

		if (parentIssue) {
			const parentIssueId = `${projectId}-${parentIssue.numberInProject}`;
			console.log(chalk.bgGreen(`OK (${parentIssueId})`));

			process.stdout.write('Requesting child issues of the parent issue... ');

			const templateSearchedChildIssues = await youtrack.issues.search(`subtask of: ${templateIssueId}`);
			const templateSearchedChildIssueIds = templateSearchedChildIssues.map(({ id }) => id);
			const childIssueIds: string[] = [];

			console.log(chalk.bgGreen(`OK (Found ${templateSearchedChildIssues.length})`));

			while (templateSearchedChildIssueIds.length) {
				const templateSearchedChildIssueId = templateSearchedChildIssueIds.pop();

				if (templateSearchedChildIssueId) {
					process.stdout.write(`Requesting data from child issue with id "${templateSearchedChildIssueId}"... `);

					// issues.search() nedava vsechna data jako tagy, musi se jit pres issues.byId()
					const templateChildIssue = await youtrack.issues.byId(templateSearchedChildIssueId);

					console.log(chalk.bgGreen('OK'));

					process.stdout.write(`Cloning child issue with id "${templateSearchedChildIssueId}"... `);

					const childIssue = await cloneIssue(templateChildIssue);

					if (childIssue) {
						console.log(chalk.bgGreen('OK'));

						childIssueIds.push(childIssue.id!);
					}
				}
			}

			if (childIssueIds.length) {
				process.stdout.write('Setting parent issue as subtask to all child issues... ');

				await youtrack.issues.executeCommand({
					query: `subtask of: ${parentIssueId}`,
					issues: childIssueIds.map((id) => ({ id })),
				})

				console.log(chalk.bgGreen('OK'));
			}

			console.log(chalk.bgGreen('DONE.'));
		}
	}
}

const program = new Command();

program
	.description('Script to clone templated issue tree for new employee on youtrack');

program
	.command('prepare')
	.description('Clone template issue tree', {
		templateIssueId: 'Id of the parent issue, fe. ABC-123',
	})
	.arguments('<templateIssueId>', )
	.requiredOption('-t, --token <string>', 'Youtrack token (Profile > Hub account > Authentication > New token)')
	.requiredOption('-u, --url <string>', 'Youtrack url')
	.action((...args) => {
		const [templateIssueId, options] = args;

		prepare({
			templateIssueId,
			...options,
		});
	});

program
	.command('*')
	.action((command) => {
		console.error(`Unknown command "${command}"`);
		program.outputHelp();
		process.exit(1);
	});

program.parse(process.argv);

