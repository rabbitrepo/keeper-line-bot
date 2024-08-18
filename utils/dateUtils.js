function formatThaiDate(date) {
    const months = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const day = date.getDate(); // Day of the month
    const month = months[date.getMonth()]; // Localized month name
    const year = date.getFullYear() + 543; // Convert to Thai Buddhist year (BE)
    const hours = date.getHours().toString().padStart(2, '0'); // Hours with leading zero
    const minutes = date.getMinutes().toString().padStart(2, '0'); // Minutes with leading zero

    return `${day} ${month} ${year} ${hours}:${minutes}`;
}

module.exports = {
    formatThaiDate
};