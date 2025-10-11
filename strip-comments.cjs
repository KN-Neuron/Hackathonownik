const fs = require('fs');
const path = require('path');
const strip = require('strip-comments');

const rootDir = process.cwd();
const targetDir = path.join(rootDir, 'src'); // Adjust if needed, e.g., './' for entire project
const excludeDirs = ['node_modules', '.git', 'dist', 'build'];
const supportedExtensions = ['.svelte', '.js', '.ts', '.css', '.html', '.scss']; // Add more as needed

function isSupportedFile(filePath) {
	const ext = path.extname(filePath);
	return supportedExtensions.includes(ext);
}

function shouldSkipDir(dir) {
	const dirName = path.basename(dir);
	return excludeDirs.includes(dirName);
}

function walkDir(dir, callback) {
	const files = fs.readdirSync(dir, { withFileTypes: true });
	files.forEach((file) => {
		const fullPath = path.join(dir, file.name);
		if (file.isDirectory()) {
			if (!shouldSkipDir(fullPath)) {
				walkDir(fullPath, callback);
			}
		} else if (isSupportedFile(fullPath)) {
			callback(fullPath);
		}
	});
}

function stripCommentsFromFile(filePath) {
	try {
		let content = fs.readFileSync(filePath, 'utf8');
		const stripped = strip(content);
		if (content !== stripped) {
			fs.writeFileSync(filePath, stripped, 'utf8');
			console.log(`Stripped comments from: ${filePath}`);
		}
	} catch (error) {
		console.error(`Error processing ${filePath}: ${error.message}`);
	}
}

console.log('Starting comment stripping...');
walkDir(targetDir, stripCommentsFromFile);
console.log('Comment stripping complete.');
