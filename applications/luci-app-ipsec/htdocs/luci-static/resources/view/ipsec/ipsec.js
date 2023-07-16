/* =========================== Begin Tunnel List page =========================== */
function goto_ipsec_list_page() {
    window.location.href = '/cgi-bin/luci/admin/network/ipsec';
}
// Add tunnel button
document.querySelectorAll('#btn_add_tunnel').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('check_add_tunnel').checked = !document.getElementById('check_add_tunnel').checked;
    });
});
document.addEventListener('click', function (e) {
    if (document.getElementById('check_add_tunnel')) {
        document.getElementById('check_add_tunnel').checked = e.target.closest('.add-tunnel-dropdown');
    }
});
document.querySelectorAll('.dd-menu li').forEach(button => {
    button.addEventListener('click', () => {
        window.location.href = button.getAttribute('href');
    });
});

// Select and deselect tunnels
function determine_all_selected() {
    let total_trs_count = document.querySelectorAll('#table-ipsec-tunnels tbody tr:not(.d-none) input[type=checkbox]:not(:disabled)').length;
    let selected_trs_count = document.querySelectorAll('#table-ipsec-tunnels tbody tr:not(.d-none) td.cbi-checkbox-field input[type=checkbox]:checked').length;
    document.getElementById('select_all').checked = total_trs_count === selected_trs_count && total_trs_count > 0;
}
document.querySelectorAll('#select_all').forEach(select_all_checkbox => {
    select_all_checkbox.addEventListener('click', () => {
        document.querySelectorAll('#table-ipsec-tunnels tbody tr td.cbi-checkbox-field input[type=checkbox]').forEach(checkbox => {
            if (checkbox.disabled) return;
            checkbox.checked = document.getElementById('select_all').checked;
        });
    });
});
document.querySelectorAll('#table-ipsec-tunnels tbody tr td.cbi-checkbox-field input[type=checkbox]').forEach(checkbox => {
    checkbox.addEventListener('click', () => {
        determine_all_selected();
    });
});

// Get list of the selected tunnel names
function get_selected_tunnel_names() {
    let selected_tunnel_names = [];
    document.querySelectorAll('#table-ipsec-tunnels tbody tr:not(.d-none) td.cbi-checkbox-field input[type=checkbox]:checked').forEach(checkbox => {
        selected_tunnel_names.push(checkbox.value);
    });

    return selected_tunnel_names;
}

function redraw_tunnel_number() {
    let trs = document.querySelectorAll('#table-ipsec-tunnels tbody tr'), s_num = 1;
    for (let i = 0; i < trs.length; i++) {
        let tr = trs[i];
        if (tr.classList.contains('d-none')) continue;

        tr.querySelector('td.s-number').textContent = s_num;
        s_num += 1;
    }
}

// Search by keyword
document.querySelectorAll('#input_search_keyword').forEach(keyword_input => {
    keyword_input.addEventListener('keyup', () => {
        // Show all trs
        document.querySelectorAll('#table-ipsec-tunnels tbody tr').forEach(tr => {
            tr.classList.remove('d-none');
        });
        // Cancel old-matched tds
        document.querySelectorAll('#table-ipsec-tunnels tbody tr td.cbi-value-field').forEach(td => {
            td.classList.remove('keyword-matched');
        });

        // Find keyword-matched tds and add class
        let keyword = document.getElementById('input_search_keyword').value;
        if (!keyword) return;
        let trs = document.querySelectorAll('#table-ipsec-tunnels tbody tr');
        trs.forEach(tr => {
            let include_keyword = false;
            tr.querySelectorAll('.cbi-value-field').forEach(td => {
                // mark td that includes keyword
                if (td.innerHTML.includes(keyword)) {
                    td.classList.add('keyword-matched');
                    include_keyword = true;
                }
            });
            // Hide tr if this tr includes keyword
            if (!include_keyword) {
                tr.classList.add('d-none');
                // deselect the checkbox of this tr
                tr.querySelector('td.cbi-checkbox-field input[type=checkbox]').checked = false;
            }
        });
        redraw_tunnel_number();
        determine_all_selected();
    });
});

// Open detail modal
document.querySelectorAll('.cbi-button-action.detail').forEach(button => {
    button.addEventListener('click', () => {
        let tunnel_id = button.closest('tr').querySelector('input[type=checkbox]').value;

        const request = new XMLHttpRequest();
        request.open('GET', `/cgi-bin/luci/admin/network/ipsec/status/${tunnel_id}`);
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                try {
                    let result = JSON.parse(request.response), i;
                    for (i = 0; i < 5; i++) {
                        if (i <= parseInt(result['data'])) {
                            document.querySelector(`#status_lamp_${i + 1}`).classList.add('success');
                            document.querySelector(`label[for="status_lamp_${i + 1}"]`).textContent = '已完成';
                        } else {
                            document.querySelector(`#status_lamp_${i + 1}`).classList.remove('success');
                            document.querySelector(`label[for="status_lamp_${i + 1}"]`).textContent = '未完成';
                        }
                    }
                } catch (e) {
                    alert(e);
                }
                document.querySelector('#tunnel-detail-modal').classList.add('show');
            }
        };
        request.send();
    });
});
document.querySelectorAll('.cbi-button-modal-close').forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('.modal-window').classList.remove('show');
    });
});

// Delete tunnels
document.querySelectorAll('.cbi-button-delete').forEach(delete_button => {
    delete_button.addEventListener('click', () => {
        let selected_tunnels = get_selected_tunnel_names();
        if (selected_tunnels.length === 0) {
            alert('请选择隧道！');
            return;
        }

        if (!confirm('您确定要删除所选隧道吗？')) return;

        // Prepare formData
        let form = document.createElement('form');
        document.body.append(form);

        const formData = new FormData(form);
        formData.append('action.delete', 'Delete');
        formData.append('param.ids', selected_tunnels.join(','));

        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                goto_ipsec_list_page();
            }
        };
        request.open('POST', window.location.href);
        request.send(formData);

        form.remove();
    });
});

function check_tunnel_name_unique(new_tunnel_name, all_tunnel_names) {
    let i, flag = true;
    for (i = 0; i < all_tunnel_names.length; i++) {
        if (all_tunnel_names[i] === new_tunnel_name) {
            flag = false;
        }
    }

    return flag;
}

function make_cloned_tunnel_names(origin_tunnels) {
    let all_tunnel_names = [];
    document.querySelectorAll('#table-ipsec-tunnels tbody tr:not(.d-none) td.cbi-checkbox-field input[type=checkbox]').forEach(checkbox => {
        all_tunnel_names.push(checkbox.value);
    });

    let i, origin_tunnel_name, new_tunnel_name, name_unique_flag = false, copy_cnt = 0, cloned_names = [], tunnel_name_candidate;
    for (i = 0; i < origin_tunnels.length; i++) {
        origin_tunnel_name = origin_tunnels[i];
        new_tunnel_name = `${origin_tunnel_name}_copy`;
        copy_cnt = 0;

        while (true) {
            tunnel_name_candidate = copy_cnt === 0 ? new_tunnel_name : `${new_tunnel_name}${copy_cnt}`;
            name_unique_flag = check_tunnel_name_unique(tunnel_name_candidate, all_tunnel_names);

            if (!name_unique_flag) {
                copy_cnt += 1;
            } else {
                break;
            }
        }

        cloned_names.push(tunnel_name_candidate);
    }

    return cloned_names;
}

// Clone tunnels
document.querySelectorAll('.cbi-button-copy').forEach(copy_button => {
    copy_button.addEventListener('click', () => {
        let selected_tunnels = get_selected_tunnel_names();
        if (selected_tunnels.length === 0) {
            alert('请选择隧道！');
            return;
        }
        let target_tunnels = make_cloned_tunnel_names(selected_tunnels);

        // Check new tunnel name length
        let long_tunnel_names = [], i = 0;
        while (i < target_tunnels.length) {
            if (target_tunnels[i].length > 31) {
                long_tunnel_names.push(selected_tunnels[i]);
                target_tunnels.splice(i, 1);
                selected_tunnels.splice(i, 1);
            } else {
                i += 1;
            }
        }
        if (long_tunnel_names.length > 0) {
            alert(`操作失败！因为隧道名称太长，对以下隧道不能进行复制。\n${long_tunnel_names.join('\n')}`);
            return;
        }

        // Prepare formData
        let form = document.createElement('form');
        document.body.append(form);

        const formData = new FormData(form);
        formData.append('action.copy', 'Copy');
        formData.append('param.fids', selected_tunnels.join(','));
        formData.append('param.tids', target_tunnels.join(','));

        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                goto_ipsec_list_page();
            }
        };
        request.open('POST', window.location.href);
        request.send(formData);

        form.remove();
    });
});

// Start tunnels
function show_not_runnable_tunnels_alert(not_runnable_tunnels) {
    let message = '';
    for (i = 0; i < not_runnable_tunnels.length; i++) {
        message += `${not_runnable_tunnels[i]} 策略配置信息不全，未启动成功。\n`;
    }
    alert(message);
}

function is_child_params_perfect(child_params) {
    let params = JSON.parse(child_params);
    for (key in params) {
        if (params[key] === '') {
            return false;
        }
    }
    return true;
}

function start_multiple_tunnels(selected_tunnels) {
    let i, remote_params, remote_id, remote_addrs, child_params, not_runnable_tunnels = [], runnable_tunnels = [];
    for (i = 0; i < selected_tunnels.length; i++) {
        // check optional params
        remote_params = document.querySelector(`table tbody tr td input[type="checkbox"][value="${selected_tunnels[i]}"]`).closest('tr').querySelector('.remote-params').value;
        if (remote_params !== '') {
            remote_id = JSON.parse(remote_params)['remote_id'];
            remote_addrs = JSON.parse(remote_params)['remote_addrs'];
            if (remote_id === '' || remote_addrs === '') {
                alert(`${selected_tunnels[i]} 包含被动协商策略，无法启动。`);
                return;
            }
        }

        // check child params
        child_params = document.querySelector(`table tbody tr td input[type="checkbox"][value="${selected_tunnels[i]}"]`).closest('tr').querySelector('.child-params').value;
        if (!is_child_params_perfect(child_params)) {
            not_runnable_tunnels.push(selected_tunnels[i]);
        } else {
            runnable_tunnels.push(selected_tunnels[i]);
        }
    }

    if (not_runnable_tunnels.length > 0) {
        show_not_runnable_tunnels_alert(not_runnable_tunnels);
    }

    if (runnable_tunnels.length === 0) return;

    // Send request to run tunnels
    // Prepare formData
    let form = document.createElement('form');
    document.body.append(form);

    const formData = new FormData(form);
    formData.append('action.start', 'Start');
    formData.append('param.ids', runnable_tunnels.join(','));

    const request = new XMLHttpRequest();
    request.onreadystatechange = () => {
        if (request.readyState === 4) {
            goto_ipsec_list_page();
        }
    };
    request.open('POST', window.location.href);
    request.send(formData);

    form.remove();
}

// Click start button for multiple tunnels
document.querySelectorAll('.cbi-button-start').forEach(start_button => {
    start_button.addEventListener('click', () => {
        let selected_tunnels = get_selected_tunnel_names();
        if (selected_tunnels.length === 0) {
            alert('请选择隧道！');
            return;
        }
        start_multiple_tunnels(selected_tunnels);
    });
});

// Click start button for individual tunnel
document.querySelectorAll('.cbi-button-action.start').forEach(start_button => {
    start_button.addEventListener('click', () => {
        let selected_tunnel = start_button.closest('tr').querySelector('input[type="checkbox"]').value;
        start_multiple_tunnels([selected_tunnel]);
    });
});

// Click edit button for individual tunnel
document.querySelectorAll('.cbi-button-action.edit').forEach(edit_button => {
    edit_button.addEventListener('click', () => {
        window.location.href = edit_button.getAttribute('href');
    });
});

// Disable tunnels
function disable_multiple_tunnels(selected_tunnels) {
    // Prepare formData
    let form = document.createElement('form');
    document.body.append(form);

    const formData = new FormData(form);
    formData.append('action.stop', 'Stop');
    formData.append('param.ids', selected_tunnels.join(','));

    const request = new XMLHttpRequest();
    request.onreadystatechange = () => {
        if (request.readyState === 4) {
            goto_ipsec_list_page();
        }
    };
    request.open('POST', window.location.href);
    request.send(formData);

    form.remove();
}

// Click disable button for multiple tunnels
document.querySelectorAll('.cbi-button-disable').forEach(disable_button => {
    disable_button.addEventListener('click', () => {
        let selected_tunnels = get_selected_tunnel_names();
        if (selected_tunnels.length === 0) {
            alert('请选择隧道！');
            return;
        }
        disable_multiple_tunnels(selected_tunnels);
    });
});

// Export config file for selected tunnels
function export_multiple_tunnels(selected_tunnels) {
    var link = document.createElement('a');
    link.setAttribute('href', `/cgi-bin/luci/admin/network/ipsec/export?ids=${selected_tunnels.join(',')}`);
    link.setAttribute('download', `tunnel_config`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
document.querySelectorAll('.cbi-button-export').forEach(export_button => {
    export_button.addEventListener('click', () => {
        let selected_tunnels = get_selected_tunnel_names();
        if (selected_tunnels.length === 0) {
            alert('请选择隧道！');
            return;
        }
        export_multiple_tunnels(selected_tunnels);
    });
});

// Import config file
function parse_section_config(config_text, section_type) {
    let section_config = {}, conn_name;

    try {
        if (section_type === 's_conn') {
            conn_name = config_text.split('\n')[0].trim();
            config_text = config_text.split(conn_name)[1].trim();
            section_config['row.id'] = conn_name.substring(1, conn_name.length - 1);
        }

        config_text.split('\n').forEach(row => {
            let option_text = row.trim();
            if (option_text.split('\'').length !== 3) return;

            key = option_text.split('\'')[0].trim().split('option ')[1];
            value = option_text.split('\'')[1];

            section_config[`row.${section_type}.${key}`] = value;
        });

        return section_config;
    }
    catch (e) {
        return {};
    }
}
function parse_config_file(file_content) {
    let connection_text_list = file_content.split('config connections');

    let i, connection_text, configs, config, section_config, tunnel_name;
    for (i = 0; i < connection_text_list.length; i++) {
        connection_text = connection_text_list[i].trim();
        if (connection_text === '') continue;

        tunnel_name = '';
        s_conn_remote_addrs = '';
        s_remote_id = '';

        let form = document.createElement('form');
        document.body.append(form);
        const formData = new FormData(form);
        formData.append('action.save', 'Save');

        configs = connection_text.split('config');
        for (j = 0; j < configs.length; j++) {
            config = configs[j].trim();
            if (config.startsWith('local\n')) {
                section_config = parse_section_config(config.split('local\n')[1].trim(), 's_local');
            }
            else if (config.startsWith('remote\n')) {
                section_config = parse_section_config(config.split('remote\n')[1].trim(), 's_remote');
            }
            else if (config.startsWith('children\n')) {
                section_config = parse_section_config(config.split('children\n')[1].trim(), 's_child');
            }
            else if (config.startsWith('\'')) {
                section_config = parse_section_config(config, 's_conn');
            }
            else {
                alert('配置文件格式不正确');
                goto_ipsec_list_page();
                return;
            }

            if (!Object.keys(section_config).length) {
                alert('配置文件格式不正确');
                goto_ipsec_list_page();
                return;
            }

            for (key in section_config) {
                let value = section_config[key];
                if (key === 'row.id') {
                    tunnel_name = value;
                    if (value === '' || !validate_tunnel_name(value)) {
                        alert('“隧道名称”不符合要求。');
                        return;
                    }
                }

                if (key === 'row.s_conn.local_addrs') {
                    if (value === '' || !validate_ip_address(value)) {
                        alert('“本端地址”不正确。');
                        return;
                    }
                }

                if (key === 'row.s_conn.remote_addrs' && value) {
                    if (!validate_ip_address(value)) {
                        alert('“远端地址”不正确。');
                        return;
                    }
                }

                if (key === 'row.s_conn.ike_proposals' && value === '') {
                    alert('“IKE算法套件”不能为空白。');
                    return;
                }

                if (key === 'row.s_conn.reauth_time') {
                    if (value === '' || !validate_number(value, 1, 86400)) {
                        alert('“IKE-SA超时”不正确。');
                        return;
                    }
                }

                if (key === 'row.s_local.id' && value === '') {
                    alert('“本端标识ID”不能为空白。');
                    return;
                }

                if (key === 'row.s_child.name' && (value === '' || !validate_tunnel_name(value))) {
                    alert('第二阶段“隧道名称”不符合要求。');
                    return;
                }

                if (key === 'row.s_child.mode' && value === '') {
                    alert('第二阶段“封装模式”不能为空白。');
                    return;
                }

                if (key === 'row.s_child.local_ts') {
                    if (value === '' || !validate_subnet_address(value)) {
                        alert('“本端子网/掩码”不正确。');
                        return;
                    }
                }

                if (key === 'row.s_child.remote_ts') {
                    if (value === '' || !validate_subnet_address(value)) {
                        alert('“远端子网/掩码”不正确。');
                        return;
                    }
                }

                if (key === 'row.s_child.esp_proposals' && value === '') {
                    alert('“ESP算法套件”不正确。');
                    return;
                }

                if (key === 'row.s_child.rekey_time' && (value === '' || !validate_number(value, 0, 28800))) {
                    alert('“IPsec-SA超时”不正确。');
                    return;
                }

                if (key === 'row.s_child.rekey_bytes' && (value === '' || !validate_number(value, 1, 4398046511104))) {
                    alert('“重协商字节”不正确。');
                    return;
                }

                if (key === 'row.s_child.rekey_packets' && (value === '' || !validate_number(value, 1, 4294967296))) {
                    alert('“重协商数据包”不正确。');
                    return;
                }

                if (key === 'row.s_conn.remote_addrs') s_conn_remote_addrs = value;
                if (key === 'row.s_remote.id') s_remote_id = value;

                formData.append(key, value);
            }

            // Check DPD fields
            if (section_config.hasOwnProperty('row.s_conn.dpd') && section_config['row.s_conn.dpd'] === 'yes') {
                try {
                    if (!section_config.hasOwnProperty('row.s_conn.dpd_timeout')) {
                        alert('没找到“DPD超时”项。');
                        return;
                    }
                    let dpd_timeout = section_config['row.s_conn.dpd_timeout'];
                    if (dpd_timeout === '' || !validate_number(dpd_timeout, 1, 3600)) {
                        alert('“DPD超时”项不正确。');
                        return;
                    }

                    if (!section_config.hasOwnProperty('row.s_conn.dpd_delay')) {
                        alert('没找到“DPD间隔”项。');
                        return;
                    }
                    let dpd_delay = section_config['row.s_conn.dpd_delay'];
                    if (dpd_delay === '' || !validate_number(dpd_delay, 1, 86400)) {
                        alert('“DPD间隔”项不正确。');
                        return;
                    }
                } catch (e) {
                    alert('DPD设置不正确。');
                    return;
                }
            }
        }

        if (tunnel_name === '') {
            alert('配置文件格式不正确');
            goto_ipsec_list_page();
            return;
        }

        // Check optional fields
        if ((s_conn_remote_addrs === '' && s_remote_id !== '') || (s_conn_remote_addrs !== '' && s_remote_id === '')) {
            alert('“远端地址”和“”远端标识ID不匹配。');
            return;
        }

        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            if (request.readyState === 4 && i === connection_text_list.length) {
                goto_ipsec_list_page();
            }
        };

        request.open('POST', `/cgi-bin/luci/admin/network/ipsec/edit/${tunnel_name}`);
        request.send(formData);

        form.remove();
    }
}
document.querySelectorAll('.cbi-button-import').forEach(import_button => {
    import_button.addEventListener('click', () => {
        document.querySelector('#import_config_file').click();
    });
});
document.querySelectorAll('#import_config_file').forEach(file_input => {
    file_input.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;

        let file_reader = new FileReader();
        file_reader.onload = () => {
            parse_config_file(file_reader.result.trim());
        };
        file_reader.readAsBinaryString(e.target.files[0]);
    });
});
/* =========================== End Tunnel List page =========================== */


/* =========================== Begin New/Edit Tunnel page =========================== */
document.querySelectorAll('.cbi-button-return').forEach(button => {
    button.addEventListener('click', () => {
        window.location.href = button.getAttribute('href');
    });
});
// Open modal
document.querySelectorAll('#btn-tunnel-ike-algorithm').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('ike-algorithm-modal').classList.add('show');
    });
});

document.querySelectorAll('#btn-tunnel-esp-algorithm').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('esp-algorithm-modal').classList.add('show');
    });
});

document.querySelectorAll('#btn-local-label-id').forEach(a_tag => {
    a_tag.addEventListener('click', () => {
        document.getElementById('local-label-id-modal').classList.add('show');
    });
});

document.querySelectorAll('#btn-remote-label-id').forEach(a_tag => {
    a_tag.addEventListener('click', () => {
        document.getElementById('remote-label-id-modal').classList.add('show');
    });
});

// Close modal
document.querySelectorAll('.cbi-button-modal-close').forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('.modal-window').classList.remove('show');
    });
});

// Enable DPD
document.querySelectorAll('#tunnel-enable-dpd').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
        if (!document.querySelector('#tunnel-enable-dpd').checked) {
            document.querySelector('#tunnel-dpd-timeout').setAttribute('disabled', true);
            document.querySelector('#tunnel-dpd-interval').setAttribute('disabled', true);
        } else {
            document.querySelector('#tunnel-dpd-timeout').removeAttribute('disabled');
            document.querySelector('#tunnel-dpd-interval').removeAttribute('disabled');
        }
    });
});

function load_ike_algorithm() {
    let transfer_algorithm = document.querySelector('#ike-algorithm-modal input[type=radio][name="tunnel-key-transfer-algorithm"]:checked').value;
    let encrypt_algorithm = document.querySelector('#ike-algorithm-modal input[type=radio][name="tunnel-encrypt-algorithm"]:checked').value;
    let verify_algorithm = document.querySelector('#ike-algorithm-modal input[type=radio][name="tunnel-verify-algorithm"]:checked').value;
    document.querySelector('#tunnel-ike-algorithm-title').textContent = `${transfer_algorithm}-${encrypt_algorithm}-${verify_algorithm}`;
}

function load_esp_algorithm() {
    let encrypt_algorithm = document.querySelector('#esp-algorithm-modal input[type=radio][name="tunnel-esp-encrypt-algorithm"]:checked').value;
    let verify_algorithm = document.querySelector('#esp-algorithm-modal input[type=radio][name="tunnel-esp-verify-algorithm"]:checked').value;
    document.querySelector('#tunnel-esp-algorithm-title').textContent = `${encrypt_algorithm}-${verify_algorithm}`;
}

// Algorithm changed
document.querySelectorAll('#ike-algorithm-modal input[type=radio]').forEach(radio_button => {
    radio_button.addEventListener('click', () => {
        load_ike_algorithm();
    });
});
document.querySelectorAll('#esp-algorithm-modal input[type=radio]').forEach(radio_button => {
    radio_button.addEventListener('click', () => {
        load_esp_algorithm();
    });
});

// Check input values
function check_required_fields() {
    let result = true;

    let elements = document.querySelectorAll('.cbi-input-text, .cbi-input-textarea');
    elements.forEach(element => {
        if (element.required && element.value === '') {
            element.classList.add('cbi-input-invalid');
            result = false;
        }
    });

    return result;
}

// Remove invalid warning
document.querySelectorAll('.cbi-input-text, .cbi-input-textarea').forEach(element => {
    element.addEventListener('keyup', () => {
        if (element.value) {
            element.classList.remove('cbi-input-invalid');
        }
    });

    element.addEventListener('onchange', () => {
        if (element.value) {
            element.classList.remove('cbi-input-invalid');
        }
    });
});

// Validate tunnel name
function validate_tunnel_name(name) {
    const tunnel_name_regex = /^[a-zA-Z0-9_-]+$/;
    return tunnel_name_regex.test(name);
}
function validate_tunnel_name_element(element) {
    let flag = validate_tunnel_name(element.value);

    if (!flag) element.classList.add('cbi-input-invalid');

    return flag;
}

// Validate the ip address pattern
function validate_ip_address(value) {
    if (value === '') return true;

    const ip_regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ip_regex.test(value);
}
function validate_ip_address_element(element) {
    let value = element.value;
    let flag = validate_ip_address(value);
    if (!flag) {
        element.classList.add('cbi-input-invalid');
    }
    return flag;
}

// Validate subnet address with netmask
function validate_subnet_address(value) {
    let flag = true;
    if (value.split('/').length !== 2) {
        flag = false;
    }

    try {
        let ip_address = value.split('/')[0];
        let netmask = parseInt(value.split('/')[1]);

        flag = validate_ip_address(ip_address) && parseInt(netmask) <= 32;
    }
    catch (e) {
        flag = false;
    }

    return flag;
}
function validate_subnet_address_element(element) {
    let value = element.value;
    let flag = validate_subnet_address(value);

    if (!flag) {
        element.classList.add('cbi-input-invalid');
    }
    return flag;
}

// Validate number if it is between min and max
function validate_number(value, min, max) {
    let flag = true;
    try {
        let num_value = parseInt(value);
        if (min !== null && num_value < min) flag = false;
        if (max !== null && num_value > max) flag = false;
    } catch (e) {
        flag = false;
    }

    return flag;
}
function validate_number_element(element, min, max) {
    let value = element.value;
    let flag = validate_number(value, min, max);

    if (!flag) {
        element.classList.add('cbi-input-invalid');
    }
    return flag;
}

// Submit - create tunnel
document.querySelectorAll('.cbi-button-save-tunnel').forEach(button => {
    button.addEventListener('click', () => {
        // Check empty field
        let validated = check_required_fields();
        if (!validated) return;

        let tunnel_id = document.querySelector('#tunnel-name');
        if (!validate_tunnel_name_element(tunnel_id)) return;

        // Check pattern validation
        let local_addrs = document.querySelector('#tunnel-local-address');
        if (!validate_ip_address_element(local_addrs)) return;

        let remote_addrs = document.querySelector('#tunnel-remote-address');
        if (!validate_ip_address_element(remote_addrs)) return;

        // check dpd time
        let dpd_timeout, dpd_interval;
        if (document.querySelector('#tunnel-enable-dpd').checked) {
            dpd_timeout = document.querySelector('#tunnel-dpd-timeout');
            if (!validate_number_element(dpd_timeout, 1, 3600)) return;

            dpd_interval = document.querySelector('#tunnel-dpd-interval');
            if (!validate_number_element(dpd_interval, 1, 86400)) return;
        }

        // check ike-sa timeout
        let ike_sa_timeout = document.querySelector('#tunnel-ike-sa-timeout');
        if (!validate_number_element(ike_sa_timeout, 1, 86400)) return;

        // check child tunnel name
        let tunnel_child_name = document.querySelector('#tunnel-child-name');
        if (tunnel_child_name.value !== '') {
            if (!validate_tunnel_name_element(tunnel_child_name)) return;
        }

        // check child network
        let child_local_network = document.querySelector('#tunnel-child-local-network');
        let child_remote_network = document.querySelector('#tunnel-child-remote-network');
        if (child_local_network.value !== '') {
            if (!validate_subnet_address_element(child_local_network)) return;
        }
        if (child_remote_network.value !== '') {
            if (!validate_subnet_address_element(child_remote_network)) return;
        }

        // check child ipsec-sa timeout
        let child_ipsec_timeout = document.querySelector('#tunnel-child-ipsec-sa-timeout');
        if (!validate_number_element(child_ipsec_timeout, 0, 28800)) return;

        // Prepare params
        let ike_proposals = `${document.querySelector('#ike-algorithm-modal input[name="tunnel-key-transfer-algorithm"]:checked').value}-${document.querySelector('#ike-algorithm-modal input[name="tunnel-encrypt-algorithm"]:checked').value}-${document.querySelector('#ike-algorithm-modal input[name="tunnel-verify-algorithm"]:checked').value}`;
        let local_id = `C = ${document.querySelector('#local-label-id-modal #local-label-id-country').value}, ` +
            `ST = ${document.querySelector('#local-label-id-modal #local-label-id-state').value}, ` +
            `L = ${document.querySelector('#local-label-id-modal #local-label-id-locality').value}, ` +
            `O = ${document.querySelector('#local-label-id-modal #local-label-id-organization').value}, ` +
            `OU = ${document.querySelector('#local-label-id-modal #local-label-id-ou').value}, ` +
            `CN = ${document.querySelector('#local-label-id-modal #local-label-id-cn').value}, ` +
            `EMAIL = ${document.querySelector('#local-label-id-modal #local-label-id-email').value}`;
        let remote_id = `C = ${document.querySelector('#remote-label-id-modal #remote-label-id-country').value}, ` +
            `ST = ${document.querySelector('#remote-label-id-modal #remote-label-id-state').value}, ` +
            `L = ${document.querySelector('#remote-label-id-modal #remote-label-id-locality').value}, ` +
            `O = ${document.querySelector('#remote-label-id-modal #remote-label-id-organization').value}, ` +
            `OU = ${document.querySelector('#remote-label-id-modal #remote-label-id-ou').value}, ` +
            `CN = ${document.querySelector('#remote-label-id-modal #remote-label-id-cn').value}, ` +
            `EMAIL = ${document.querySelector('#remote-label-id-modal #remote-label-id-email').value}`;
        let esp_proposals = `${document.querySelector('#esp-algorithm-modal input[name="tunnel-esp-encrypt-algorithm"]:checked').value}-${document.querySelector('#esp-algorithm-modal input[name="tunnel-esp-verify-algorithm"]:checked').value}`;

        // check optional fields
        if ((remote_addrs.value === '' && remote_id !== '') || (remote_addrs.value !== '' && remote_id === '')) {
            alert('“远端地址”和“”远端标识ID不匹配。');
            return;
        }

        // Prepare formData
        let form = document.createElement('form');
        document.body.append(form);

        const formData = new FormData(form);

        formData.append('row.id', tunnel_id.value);
        formData.append('row.s_conn.type', 'key_conn_tunnel');
        formData.append('row.s_conn.version', '1');
        formData.append('row.s_conn.local_addrs', local_addrs.value);
        formData.append('row.s_conn.remote_addrs', remote_addrs.value);
        formData.append('row.s_conn.ike_proposals', ike_proposals);
        formData.append('row.s_conn.nat_service', document.querySelector('#tunnel-nat').checked ? 'yes' : 'no');
        formData.append('row.s_conn.reauth_time', ike_sa_timeout.value);
        if (document.querySelector('#tunnel-enable-dpd').checked) {
            formData.append('row.s_conn.dpd', 'yes');
            formData.append('row.s_conn.dpd_timeout', dpd_timeout.value);
            formData.append('row.s_conn.dpd_delay', dpd_interval.value);
        } else {
            formData.append('row.s_conn.dpd', 'no');
            formData.append('row.s_conn.dpd_timeout', 0);
            formData.append('row.s_conn.dpd_delay', 0);
        }

        formData.append('row.s_local.parent', tunnel_id.value);
        // formData.append('row.s_local.certs', document.querySelector('#tunnel-encrypt-cert').value);
        // formData.append('row.s_local.certs_sign', document.querySelector('#tunnel-sign-cert').value);
        formData.append('row.s_local.auth', 'pubkey');
        formData.append('row.s_local.id', local_id);
        formData.append('row.s_remote.parent', tunnel_id.value);
        formData.append('row.s_remote.auth', 'pubkey');
        formData.append('row.s_remote.id', remote_id);
        formData.append('row.s_child.parent', tunnel_id.value);
        formData.append('row.s_child.name', tunnel_child_name.value);
        formData.append('row.s_child.local_ts', child_local_network.value);
        formData.append('row.s_child.remote_ts', child_remote_network.value);
        formData.append('row.s_child.rekey_time', child_ipsec_timeout.value);
        formData.append('row.s_child.rekey_bytes', document.querySelector('#tunnel-child-reconn-string').value);
        formData.append('row.s_child.rekey_packets', document.querySelector('#tunnel-child-reconn-pack').value);
        formData.append('row.s_child.esp_proposals', esp_proposals);
        formData.append('row.s_child.mode', document.querySelector('input[name=tunnel-child-encap-mode]:checked').value);
        formData.append('row.s_child.dpd_action', 'restart');
        formData.append('row.s_child.start_action', 'auto');
        formData.append('row.s_child.auto_action', 'trap');
        formData.append('row.s_child.description', document.querySelector('#tunnel-description').value);
        formData.append('action.save', 'Save');

        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                if (request.status === 400) {
                    alert('该隧道名称已存在。请使用其他名称');
                } else {
                    goto_ipsec_list_page();
                }
            }
        };

        request.open('POST', window.location.href);
        request.send(formData);

        form.remove();
    });
});

function load_local_id(local_id) {
    local_id = local_id.replace('/emailAddress', ', EMAIL');
    let local_id_map = {};
    local_id.split(',').forEach(item => {
        let key = item.trim().split('=')[0].trim();
        let value = item.trim().split('=')[1].trim();
        local_id_map[key] = value;
    });

    document.querySelector('#local-label-id-modal #local-label-id-country').value = local_id_map.hasOwnProperty('C') ? local_id_map['C'] : '';
    document.querySelector('#local-label-id-modal #local-label-id-state').value = local_id_map.hasOwnProperty('ST') ? local_id_map['ST'] : '';
    document.querySelector('#local-label-id-modal #local-label-id-locality').value = local_id_map.hasOwnProperty('L') ? local_id_map['L'] : '';
    document.querySelector('#local-label-id-modal #local-label-id-organization').value = local_id_map.hasOwnProperty('O') ? local_id_map['O'] : '';
    document.querySelector('#local-label-id-modal #local-label-id-ou').value = local_id_map.hasOwnProperty('OU') ? local_id_map['OU'] : '';
    document.querySelector('#local-label-id-modal #local-label-id-cn').value = local_id_map.hasOwnProperty('CN') ? local_id_map['CN'] : '';
    document.querySelector('#local-label-id-modal #local-label-id-email').value = local_id_map.hasOwnProperty('EMAIL') ? local_id_map['EMAIL'] : '';
}

function load_ike_proposals() {
    let algorithms = old_ike_proposals.split('-');
    document.querySelectorAll('#ike-algorithm-modal input[type=radio]').forEach(radiobox => {
        radiobox.checked = false;
    });

    document.querySelector(`#ike-algorithm-modal input[name="tunnel-key-transfer-algorithm"][value="${algorithms[0]}"]`).checked = true;
    document.querySelector(`#ike-algorithm-modal input[name="tunnel-encrypt-algorithm"][value="${algorithms[1]}"]`).checked = true;
    document.querySelector(`#ike-algorithm-modal input[name="tunnel-verify-algorithm"][value="${algorithms[2]}"]`).checked = true;
}

function load_remote_id() {
    let old_remote_id_map = {};
    old_remote_id.split(', ').forEach(item => {
        let key = item.split(' = ')[0];
        let value = item.split(' = ')[1];
        old_remote_id_map[key] = value;
    });

    document.querySelector('#remote-label-id-modal #remote-label-id-country').value = old_remote_id_map['C'];
    document.querySelector('#remote-label-id-modal #remote-label-id-state').value = old_remote_id_map['ST'];
    document.querySelector('#remote-label-id-modal #remote-label-id-locality').value = old_remote_id_map['L'];
    document.querySelector('#remote-label-id-modal #remote-label-id-organization').value = old_remote_id_map['O'];
    document.querySelector('#remote-label-id-modal #remote-label-id-ou').value = old_remote_id_map['OU'];
    document.querySelector('#remote-label-id-modal #remote-label-id-cn').value = old_remote_id_map['CN'];
    document.querySelector('#remote-label-id-modal #remote-label-id-email').value = old_remote_id_map['EMAIL'];
}

function load_esp_proposals() {
    let algorithms = old_esp_proposals.split('-');
    document.querySelectorAll('#esp-algorithm-modal input[type=radio]').forEach(radiobox => {
        radiobox.checked = false;
    });

    document.querySelector(`#esp-algorithm-modal input[name="tunnel-esp-encrypt-algorithm"][value="${algorithms[0]}"]`).checked = true;
    document.querySelector(`#esp-algorithm-modal input[name="tunnel-esp-verify-algorithm"][value="${algorithms[1]}"]`).checked = true;
}
/* =========================== End New/Edit Tunnel page =========================== */


/* =========================== Begin New/Edit Manual Tunnel page =========================== */
document.querySelectorAll('#btn-tunnel-manual-inbound-encrypt-algorithm').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('manual-tunnel-inbound-encrypt-algorithm-modal').classList.add('show');
    });
});
document.querySelectorAll('#btn-tunnel-manual-inbound-verify-algorithm').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('manual-tunnel-inbound-verify-algorithm-modal').classList.add('show');
    });
});
document.querySelectorAll('#btn-tunnel-manual-outbound-encrypt-algorithm').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('manual-tunnel-outbound-encrypt-algorithm-modal').classList.add('show');
    });
});
document.querySelectorAll('#btn-tunnel-manual-outbound-verify-algorithm').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('manual-tunnel-outbound-verify-algorithm-modal').classList.add('show');
    });
});

// Algorithm changed
function load_manual_algorithm() {
    let algorithm = document.querySelector('#manual-tunnel-inbound-encrypt-algorithm-modal input[type=radio]:checked').value;
    document.querySelector('#tunnel-manual-inbound-encrypt-algorithm-title').textContent = algorithm;

    algorithm = document.querySelector('#manual-tunnel-inbound-verify-algorithm-modal input[type=radio]:checked').value;
    document.querySelector('#tunnel-manual-inbound-verify-algorithm-title').textContent = algorithm;

    algorithm = document.querySelector('#manual-tunnel-outbound-encrypt-algorithm-modal input[type=radio]:checked').value;
    document.querySelector('#tunnel-manual-outbound-encrypt-algorithm-title').textContent = algorithm;

    algorithm = document.querySelector('#manual-tunnel-outbound-verify-algorithm-modal input[type=radio]:checked').value;
    document.querySelector('#tunnel-manual-outbound-verify-algorithm-title').textContent = algorithm;
}

document.querySelectorAll('#manual-tunnel-inbound-encrypt-algorithm-modal input[type=radio], #manual-tunnel-inbound-verify-algorithm-modal input[type=radio], #manual-tunnel-outbound-encrypt-algorithm-modal input[type=radio], #manual-tunnel-outbound-verify-algorithm-modal input[type=radio]').forEach(radio_button => {
    radio_button.addEventListener('click', () => {
        load_manual_algorithm();
    });
});

// Save manual channel
document.querySelectorAll('.cbi-button-save-manual-tunnel').forEach(button => {
    button.addEventListener('click', (e) => {
        // Check empty field
        let validated = check_required_fields();
        if (!validated) return;

        // Check tunnel name
        let tunnel_id = document.querySelector('#tunnel-name');
        if (!validate_tunnel_name_element(tunnel_id)) return;

        // Check pattern validation
        let local_addrs = document.querySelector('#tunnel-local-address');
        if (!validate_ip_address_element(local_addrs)) return;

        let remote_addrs = document.querySelector('#tunnel-remote-address');
        if (!validate_ip_address_element(remote_addrs)) return;

        // Check SPI
        let input_spi = document.querySelector('#tunnel-input-spi');
        if (!validate_number_element(input_spi, 4091, 65535)) return;

        let output_spi = document.querySelector('#tunnel-output-spi');
        if (!validate_number_element(output_spi, 4091, 65535)) return;

        // check child network
        let child_local_network = document.querySelector('#tunnel-child-local-network');
        let child_remote_network = document.querySelector('#tunnel-child-remote-network');
        if (child_local_network.value !== '') {
            if (!validate_subnet_address_element(child_local_network)) return;
        }
        if (child_remote_network.value !== '') {
            if (!validate_subnet_address_element(child_remote_network)) return;
        }

        // inbound params
        let inencrypt_proposals = document.querySelector('#manual-tunnel-inbound-encrypt-algorithm-modal input[type=radio]:checked').value;
        let inencrypt_key = document.querySelector('#tunnel-inbound-encrypt-key');
        if (inencrypt_key.value.length !== 34) {
            inencrypt_key.classList.add('cbi-input-invalid');
            return;
        }
        let inverify_proposals = document.querySelector('#manual-tunnel-inbound-verify-algorithm-modal input[type=radio]:checked').value;
        let inverify_key = document.querySelector('#tunnel-inbound-verify-key');
        if (inverify_key.value.length !== 66) {
            inverify_key.classList.add('cbi-input-invalid');
            return;
        }

        // outbound params
        let outencrypt_proposals = document.querySelector('#manual-tunnel-outbound-encrypt-algorithm-modal input[type=radio]:checked').value;
        let outencrypt_key = document.querySelector('#tunnel-outbound-encrypt-key');
        if (outencrypt_key.value.length !== 34) {
            outencrypt_key.classList.add('cbi-input-invalid');
            return;
        }
        let outverify_proposals = document.querySelector('#manual-tunnel-outbound-verify-algorithm-modal input[type=radio]:checked').value;
        let outverify_key = document.querySelector('#tunnel-outbound-verify-key');
        if (outverify_key.value.length !== 66) {
            outverify_key.classList.add('cbi-input-invalid');
            return;
        }

        // Prepare formData
        let form = document.createElement('form');
        document.body.append(form);

        const formData = new FormData(form);

        formData.append('row.id', tunnel_id.value);
        formData.append('row.s_conn.type', 'manual_tunnel');
        formData.append('row.s_conn.local_addrs', local_addrs.value);
        formData.append('row.s_conn.remote_addrs', remote_addrs.value);

        formData.append('row.s_conn.output_spi', output_spi.value);
        formData.append('row.s_conn.outencrypt_proposals', outencrypt_proposals);
        formData.append('row.s_conn.outencrypt_key', outencrypt_key.value);
        formData.append('row.s_conn.outverify_proposals', outverify_proposals);
        formData.append('row.s_conn.outverify_key', outverify_key.value);

        formData.append('row.s_conn.input_spi', input_spi.value);
        formData.append('row.s_conn.inencrypt_proposals', inencrypt_proposals);
        formData.append('row.s_conn.inencrypt_key', inencrypt_key.value);
        formData.append('row.s_conn.inverify_proposals', inverify_proposals);
        formData.append('row.s_conn.inverify_key', inverify_key.value);

        formData.append('row.s_conn.nat_service', document.querySelector('#tunnel-nat').checked ? 'yes' : 'no');
        formData.append('row.s_conn.local_ts', child_local_network.value);
        formData.append('row.s_conn.remote_ts', child_remote_network.value);
        formData.append('action.save', 'Save');

        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            form.remove();
            if (request.readyState === 4) {
                if (request.status === 400) {
                    alert('该隧道名称已存在。请使用其他名称');
                } else {
                    goto_ipsec_list_page();
                }
            }
        };

        request.open('POST', window.location.href);
        request.send(formData);
    });
});

function load_manual_tunnel_proposals(inencrypt_proposals, inverify_proposals, outencrypt_proposals, outverify_proposals) {
    document.querySelectorAll('#manual-tunnel-inbound-encrypt-algorithm-modal input[type=radio]').forEach(radiobox => {
        radiobox.checked = false;
    });
    document.querySelector(`#manual-tunnel-inbound-encrypt-algorithm-modal input[type=radio][value="${inencrypt_proposals}"]`).checked = true;

    document.querySelectorAll('#manual-tunnel-inbound-verify-algorithm-modal input[type=radio]').forEach(radiobox => {
        radiobox.checked = false;
    });
    document.querySelector(`#manual-tunnel-inbound-verify-algorithm-modal input[type=radio][value="${inverify_proposals}"]`).checked = true;

    document.querySelectorAll('#manual-tunnel-outbound-encrypt-algorithm-modal input[type=radio]').forEach(radiobox => {
        radiobox.checked = false;
    });
    document.querySelector(`#manual-tunnel-outbound-encrypt-algorithm-modal input[type=radio][value="${outencrypt_proposals}"]`).checked = true;

    document.querySelectorAll('#manual-tunnel-outbound-verify-algorithm-modal input[type=radio]').forEach(radiobox => {
        radiobox.checked = false;
    });
    document.querySelector(`#manual-tunnel-outbound-verify-algorithm-modal input[type=radio][value="${outverify_proposals}"]`).checked = true;
}

/* =========================== End New/Edit Manual Tunnel page =========================== */


// Check numbers
document.querySelectorAll('#tunnel-ike-sa-timeout').forEach(input => {
    input.addEventListener('focusout', () => {
        if (input.value < 1 || input.value > 86400) {
            input.value = 3000;
        }
    });
});

document.querySelectorAll('#tunnel-child-ipsec-sa-timeout').forEach(input => {
    input.addEventListener('focusout', () => {
        if (input.value < 0 || input.value > 28800) {
            input.value = 300;
        }
    });
});

document.querySelectorAll('#tunnel-child-reconn-string').forEach(input => {
    input.addEventListener('focusout', () => {
        if (isNaN(input.value)) {
            input.value = 500000000;
            return;
        }

        if (parseInt(input.value) < 1 || parseInt(input.value) > 4398046511104) {
            input.value = 500000000;
        }
    });
});

document.querySelectorAll('#tunnel-child-reconn-pack').forEach(input => {
    input.addEventListener('focusout', () => {
        if (isNaN(input.value)) {
            input.value = 1000000;
            return;
        }

        if (parseInt(input.value) < 1 || parseInt(input.value) > 4294967296) {
            input.value = 1000000;
        }
    });
});
