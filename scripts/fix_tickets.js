const fs = require('fs');
const f = 'Frontend/admin-dashboard.html';
let c = fs.readFileSync(f, 'utf8');
const NL = '\r\n';
let changed = 0;

// 4. Add ${vipBadge} to ticket card template after ${unseenBadge}
const p4 = '${unseenBadge}' + NL + '                            </div>';
if (c.includes(p4)) {
    c = c.replace(p4, '${unseenBadge} ${vipBadge}' + NL + '                            </div>');
    changed++;
    console.log('4. Added ${vipBadge} to ticket card template');
} else { console.log('4. SKIP'); }

// 5. Add VIP badge to ticket details modal header
const p5 = '<h3 class="font-semibold text-gray-800 text-lg">${safeSubject}</h3>' + NL + '                            <p class="text-sm text-gray-600 mt-1">From: ${safeUserName} (${safeUserEmail})</p>';
if (c.includes(p5)) {
    const vip = "${ticket.priority === 'vip' ? '<span class=\"px-2 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-sm\">⭐ VIP Priority</span>' : ''}";
    c = c.replace(p5, '<h3 class="font-semibold text-gray-800 text-lg">${safeSubject}</h3>' + NL + '                            ' + vip + NL + '                            <p class="text-sm text-gray-600 mt-1">From: ${safeUserName} (${safeUserEmail})</p>');
    changed++;
    console.log('5. Added VIP badge to ticket details modal');
} else { console.log('5. SKIP - details modal pattern not found'); }

// 6. Add VIP badge to grouped ticket list - after the unseen expression ends with backtick
const p6 = "': ''}\`";
if (c.includes(p6)) {
    // Find the exact grouped list unseen badge and add VIP after it
    const marker = "t.seen === false ? '<span class=\"ml-2 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800\">⚠️ Unseen</span>' : ''}`";
    if (c.includes(marker)) {
        c = c.replace(marker, marker + " ${t.priority === 'vip' ? '<span class=\"ml-2 inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-xs font-medium text-white\">⭐ VIP</span>' : ''}");
        changed++;
        console.log('6. Added VIP badge to grouped ticket list');
    } else { console.log('6. SKIP - grouped unseen badge marker not found'); }
} else { console.log('6. SKIP - backtick pattern not found'); }

// 7. Add VIP color to error fallback priorityColors  
const p7 = "'high': 'text-red-600'" + NL + "                };";
if (c.includes(p7)) {
    c = c.replace(p7, "'high': 'text-red-600'," + NL + "                    'vip': 'text-amber-600'" + NL + "                };");
    changed++;
    console.log('7. Added VIP color to error fallback');
} else { console.log('7. SKIP - error fallback pattern not found'); }

// 8. Add VIP option to dropdown
const p8 = '<option value="closed">Closed</option>' + NL + '                        </select>';
if (c.includes(p8)) {
    c = c.replace(p8, '<option value="closed">Closed</option>' + NL + '                            <option value="vip">⭐ VIP Priority</option>' + NL + '                        </select>');
    changed++;
    console.log('8. Added VIP filter option to dropdown');
} else { console.log('8. SKIP - dropdown pattern not found'); }

fs.writeFileSync(f, c, 'utf8');
console.log(`\nDone - applied ${changed} additional changes`);