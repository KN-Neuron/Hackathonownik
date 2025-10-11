import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportRankingToPdf(rankings, totalJuries) {
	const doc = new jsPDF();

	doc.setFontSize(18);
	doc.text('Heroes of the Brain 2025 - Team Rankings', 14, 20);

	const today = new Date();
	doc.setFontSize(10);
	doc.text(`Generated on: ${today.toLocaleDateString()}`, 14, 30);

	doc.text(`Total Teams: ${rankings.length}`, 14, 40);
	doc.text(`Total Juries: ${totalJuries}`, 14, 45);

	const tableData = rankings.map((team, index) => [
		index + 1, // Rank
		team.team, // Team name
		team.innovation.toFixed(1), // Innovation score
		team.usefulness.toFixed(1), // Usefulness score
		team.finalPresentation.toFixed(1), // Presentation score
		team.implementation.toFixed(1), // Implementation score
		team.finalGrade.toFixed(2), // Final grade
		`${team.ratingCount}/${totalJuries} (${team.status})` // Status
	]);

	const headers = [
		'Rank',
		'Team',
		'Innovation',
		'Usefulness',
		'Presentation',
		'Implementation',
		'Final Grade',
		'Status'
	];

	doc.autoTable({
		head: [headers],
		body: tableData,
		startY: 55,
		headStyles: { fillColor: [59, 130, 246] },
		alternateRowStyles: { fillColor: [240, 240, 240] },
		styles: { textColor: [50, 50, 50] }
	});

	doc.save('heroes-of-the-brain-rankings.pdf');
}
