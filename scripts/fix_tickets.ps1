$f = 'Frontend/admin-dashboard.html'
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
$changed = 0

# 1. Remove #ticketDetailsModal from CSS hiding rule
$old1 = '#orderDetailsModal, #editStaffModal, #ticketDetailsModal {'
if ($c.Contains($old1)) {
    $c = $c.Replace($old1, '#orderDetailsModal, #editStaffModal {')
    $changed++
    Write-Host "1. Removed #ticketDetailsModal from CSS hiding rule"
} else {
    Write-Host "1. CSS rule already fixed or not found"
}

# 2. Add vip to priorityColors in renderTicketsList
$old2 = "'high': 'text-red-600'"
if ($c.Contains($old2)) {
    $c = $c.Replace($old2, "'high': 'text-red-600'," + "`r`n" + "                    'vip': 'text-amber-600'")
    $changed++
    Write-Host "2. Added VIP priority color"
} else {
    Write-Host "2. VIP priority color already present"
}

# 3. Add VIP badge to ticket list cards - insert after unseenBadge variable
$old3 = "const unseenBadge = (ticket.seen === false) ? `<span class=``"px-2 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700``">Unseen</span>` : '';"
if ($c.Contains($old3)) {
    $new3 = "const unseenBadge = (ticket.seen === false) ? `<span class=``"px-2 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700``">Unseen</span>` : '';" + "`r`n" + "                const vipBadge = isVipPriority ? '<span class=""px-2 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-sm"">VIP</span>' : '';"
    $c = $c.Replace($old3, $new3)
    $changed++
    Write-Host "3. Added VIP badge variable to ticket list"
}

# 4. Add VIP badge to ticket list card HTML - after unseenBadge in template
$old4 = "${unseenBadge}`" + "`r`n" + "                            </div>" + "`r`n" + "                            <h3 class=""text-lg font-semibold text-gray-800 mb-1"">${safeSubject}</h3>"
if ($c.Contains($old4)) {
    $new4 = "${unseenBadge} ${vipBadge}`" + "`r`n" + "                            </div>" + "`r`n" + "                            <h3 class=""text-lg font-semibold text-gray-800 mb-1"">${safeSubject}</h3>"
    $c = $c.Replace($old4, $new4)
    $changed++
    Write-Host "4. Added VIP badge to ticket card HTML"
}

# 5. Add VIP badge to ticket details modal - in the header
$old5 = "<h3 class=""font-semibold text-gray-800 text-lg"">${safeSubject}</h3>" + "`r`n" + "                            <p class=""text-sm text-gray-600 mt-1"">From: ${safeUserName}"
if ($c.Contains($old5)) {
    $new5 = "<h3 class=""font-semibold text-gray-800 text-lg"">${safeSubject}</h3>" + "`r`n" + "                            ${ticket.priority === 'vip' ? '<span class=""px-2 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-sm"">VIP Priority</span>' : ''}" + "`r`n" + "                            <p class=""text-sm text-gray-600 mt-1"">From: ${safeUserName}"
    $c = $c.Replace($old5, $new5)
    $changed++
    Write-Host "5. Added VIP badge to ticket details modal"
}

# 6. Add VIP badge to grouped ticket list - after unseen badge in group
$old6 = "t.seen === false ? '<span class=""ml-2 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"">Unseen</span>' : ''}`""
if ($c.Contains($old6)) {
    $new6 = "t.seen === false ? '<span class=""ml-2 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"">Unseen</span>' : ''} ${t.priority === 'vip' ? '<span class=""ml-2 inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-xs font-medium text-white"">VIP</span>' : ''}`""
    $c = $c.Replace($old6, $new6)
    $changed++
    Write-Host "6. Added VIP badge to grouped ticket list"
}

# 7. Add VIP badge to error fallback ticket list
$old7 = "'low': 'text-gray-600'," + "`r`n" + "                    'medium': 'text-yellow-600'," + "`r`n" + "                    'high': 'text-red-600'" + "`r`n" + "                };"
if ($c.Contains($old7)) {
    $new7 = "'low': 'text-gray-600'," + "`r`n" + "                    'medium': 'text-yellow-600'," + "`r`n" + "                    'high': 'text-red-600'," + "`r`n" + "                    'vip': 'text-amber-600'" + "`r`n" + "                };"
    $c = $c.Replace($old7, $new7)
    $changed++
    Write-Host "7. Added VIP color to error fallback"
}

# 8. Add VIP option to status filter dropdown
$old8 = "<option value=""closed"">Closed</option>" + "`r`n" + "                        </select>"
if ($c.Contains($old8)) {
    $new8 = "<option value=""closed"">Closed</option>" + "`r`n" + "                            <option value=""vip"">VIP Priority</option>" + "`r`n" + "                        </select>"
    $c = $c.Replace($old8, $new8)
    $changed++
    Write-Host "8. Added VIP filter option to dropdown"
}

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "`nDone - applied $changed changes"