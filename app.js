import { themeFromSourceColor, applyTheme, argbFromHex } from "https://esm.run/@material/material-color-utilities";

document.addEventListener('DOMContentLoaded', () => {
    // Enable KaTeX support in marked.js
    if (typeof markedKatex !== 'undefined') {
        marked.use(markedKatex({ throwOnError: false }));
    }

    const treeContainer = document.getElementById('tree-container');
    const markdownContainer = document.getElementById('markdown-container');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');

    let currentPath = new URLSearchParams(window.location.search).get('path') || '';
    let globalTreeData = [];
    let currentMarkdown = '';

    // Shared Empty State HTML
    const getEmptyStateHtml = () => `
        <h1>Welcome to Wiki</h1>
        <p>Select a document from the left sidebar to start reading.</p>
    `;

    function loadHome(historyMode = 'push') {
        if (globalConfig.homeDocument) {
            currentPath = globalConfig.homeDocument;
            if (historyMode === 'push') window.history.pushState({ path: currentPath }, '', `?path=${encodeURIComponent(currentPath)}`);
            if (historyMode === 'replace') window.history.replaceState({ path: currentPath }, '', `?path=${encodeURIComponent(currentPath)}`);
            loadContent(currentPath);
        } else {
            currentPath = '';
            if (historyMode === 'push') window.history.pushState({ path: '' }, '', window.location.pathname);
            if (historyMode === 'replace') window.history.replaceState({ path: '' }, '', window.location.pathname);
            
            // Render root folder list
            renderFolder('', { children: globalTreeData, type: 'folder', name: globalConfig.siteTitle || 'Home', path: '' });
            document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
        }
    }

    // Icon Animation Trigger
    function triggerIconAnim(btnId, animClass) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const icon = btn.querySelector('md-icon');
        if (!icon) return;
        icon.classList.remove(animClass);
        void icon.offsetWidth; // trigger reflow
        icon.classList.add(animClass);
    }

    // Initialize Menu Toggle
    menuToggle.addEventListener('click', () => {
        triggerIconAnim('menu-toggle', 'icon-anim-stretch');
        sidebar.classList.toggle('hidden');
    });

    // Close sidebar and TOC popover when clicking outside
    document.addEventListener('click', (e) => {
        // Sidebar
        if (!sidebar.classList.contains('hidden')) {
             if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                triggerIconAnim('menu-toggle', 'icon-anim-stretch');
                sidebar.classList.add('hidden');
            }
        }

        // TOC Popover
        const mobileTocPopover = document.getElementById('mobile-toc-popover');
        const tocFabBtn = document.getElementById('toc-fab-btn');
        if (mobileTocPopover && !mobileTocPopover.classList.contains('hidden')) {
            if (!mobileTocPopover.contains(e.target) && (!tocFabBtn || !tocFabBtn.contains(e.target))) {
                mobileTocPopover.classList.add('hidden');
            }
        }
    });

    // Handle responsive sidebar on load
    if (window.innerWidth <= 768) {
        sidebar.classList.add('hidden');
    }

    // Load file tree
    async function loadTree() {
        try {
            const response = await fetch('tree.json', { cache: 'no-store' });
            const treeData = await response.json();
            globalTreeData = treeData;
            treeContainer.innerHTML = ''; // Clear existing
            renderTree(treeData, treeContainer);
        } catch (error) {
            console.error('Failed to load tree:', error);
            treeContainer.innerHTML = '<div style="padding: 16px; color: red;">Failed to load navigation.</div>';
        }
    }

    // Recursively render tree DOM
    function renderTree(items, parentElement, level = 0) {
        items.forEach(item => {
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'tree-node';

            const itemDiv = document.createElement('div');
            itemDiv.className = 'tree-item';
            // Indentation based on level
            itemDiv.style.paddingLeft = `${16 + (level * 16)}px`;
            
            const iconElement = document.createElement('md-icon');
            const textElement = document.createElement('span');
            textElement.textContent = item.title || item.name;

            if (item.type === 'folder') {
                iconElement.textContent = 'folder';
                itemDiv.appendChild(iconElement);
                itemDiv.appendChild(textElement);
                
                const childrenWrapper = document.createElement('div');
                childrenWrapper.className = 'tree-children-wrapper';

                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-children';
                childrenWrapper.appendChild(childrenContainer);
                
                // Check if we need to open this folder based on currentPath
                const isOpen = currentPath.startsWith(item.path + '/');
                if (isOpen) {
                    childrenWrapper.classList.add('open');
                    iconElement.textContent = 'folder_open';
                }

                itemDiv.addEventListener('click', () => {
                    window.history.pushState({ path: item.path }, '', window.location.pathname + '?path=' + encodeURIComponent(item.path));
                    loadContent(item.path);
                    const isOpening = !childrenWrapper.classList.contains('open');
                    childrenWrapper.classList.toggle('open');
                    iconElement.textContent = isOpening ? 'folder_open' : 'folder';
                });

                nodeDiv.appendChild(itemDiv);
                nodeDiv.appendChild(childrenWrapper);
                renderTree(item.children, childrenContainer, level + 1);

            } else if (item.type === 'file') {
                iconElement.textContent = 'description';
                itemDiv.appendChild(iconElement);
                itemDiv.appendChild(textElement);

                if (currentPath === item.path) {
                    itemDiv.classList.add('active');
                }

                itemDiv.addEventListener('click', () => {
                    // Update active state
                    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                    itemDiv.classList.add('active');
                    
                    // On mobile, close sidebar after selection
                    if (window.innerWidth <= 768) {
                        sidebar.classList.add('hidden');
                    }

                    loadContent(item.path);
                    
                    // Update URL
                    const newUrl = new URL(window.location);
                    newUrl.searchParams.set('path', item.path);
                    window.history.pushState({ path: item.path }, '', newUrl);
                });

                nodeDiv.appendChild(itemDiv);
            }

            parentElement.appendChild(nodeDiv);
        });
    }

    // Load and render markdown content
    function processTimeMacros(text) {
        if (!text) return '';
        const now = new Date();

        text = text.replace(/\{\{NOW\}\}/g, () => {
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        });

        const msPerDay = 1000 * 60 * 60 * 24;
        const getDiffDays = (targetDateStr) => {
            const target = new Date(targetDateStr);
            if (isNaN(target.getTime())) return null;
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
            return Math.floor((today - targetMidnight) / msPerDay);
        };

        text = text.replace(/\{\{DDAY:([0-9]{4}-[0-9]{2}-[0-9]{2})\}\}/g, (match, dateStr) => {
            const diff = getDiffDays(dateStr);
            if (diff === null) return match;
            if (diff > 0) return `D+${diff}`;
            if (diff < 0) return `D${diff}`;
            return `D-Day`;
        });

        text = text.replace(/\{\{DAYS_SINCE:([0-9]{4}-[0-9]{2}-[0-9]{2})\}\}/g, (match, dateStr) => {
            const diff = getDiffDays(dateStr);
            return diff !== null ? diff.toString() : match;
        });

        text = text.replace(/\{\{DAYS_UNTIL:([0-9]{4}-[0-9]{2}-[0-9]{2})\}\}/g, (match, dateStr) => {
            const diff = getDiffDays(dateStr);
            return diff !== null ? (-diff).toString() : match;
        });

        return text;
    }

    function findNodeInTree(path, tree) {
        for (let item of tree) {
            if (item.path === path) return item;
            if (item.children) {
                const found = findNodeInTree(path, item.children);
                if (found) return found;
            }
        }
        return null;
    }

    function renderFolder(path, folderNode) {
        currentPath = path;
        
        let breadcrumbsHtml = '';
        let headerHtml = '';
        let carouselHtml = '';
        
        if (path) {
            breadcrumbsHtml = `<div class="breadcrumbs" style="margin-bottom: 24px; font-size: 14px; color: var(--md-sys-color-primary);">`;
            breadcrumbsHtml += `<span class="breadcrumb-folder" data-path="" style="cursor:pointer; opacity:0.7;">Home</span> `;
            const parts = path.split('/');
            let currentFolderPath = '';
            parts.forEach((p, index) => {
                breadcrumbsHtml += `<md-icon style="font-size: 16px; opacity:0.5; vertical-align: middle;">chevron_right</md-icon> `;
                if (index === parts.length - 1) {
                    breadcrumbsHtml += `<span class="breadcrumb-current" style="cursor:pointer; font-weight:500;">${p}</span>`;
                } else {
                    currentFolderPath += (currentFolderPath ? '/' : '') + p;
                    breadcrumbsHtml += `<span class="breadcrumb-folder" data-path="${currentFolderPath}" style="cursor:pointer; opacity:0.7;">${p}</span>`;
                }
            });
            breadcrumbsHtml += `</div>`;
            
            const folderName = path.split('/').pop();
            headerHtml = `
                <div class="blog-header" style="margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid var(--md-sys-color-surface-variant); animation: fadeIn 0.3s ease;">
                    <h1 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 700;">${folderName}</h1>
                </div>
            `;
        } else {
            let allPosts = [];
            function flattenTree(node) {
                if (node.type === 'file') allPosts.push(node);
                if (node.children) node.children.forEach(flattenTree);
            }
            flattenTree({ children: globalTreeData });
            
            // Sort allPosts by date descending (robust date parsing for all browsers)
            allPosts.sort((a, b) => {
                const parseDate = (d) => {
                    if (!d) return 0;
                    const safe = d.replace(' ', 'T');
                    return new Date(safe).getTime() || 0;
                };
                return parseDate(b.date) - parseDate(a.date);
            });
            
            let carouselPosts = allPosts.filter(p => p.thumbnail);
            if (carouselPosts.length < 5) {
                const noThumbPosts = allPosts.filter(p => !p.thumbnail);
                carouselPosts = carouselPosts.concat(noThumbPosts).slice(0, 5);
            } else {
                carouselPosts = carouselPosts.slice(0, 5);
            }
            
            if (carouselPosts.length > 0) {
                let slides = carouselPosts.map((post, i) => `
                    <div class="carousel-slide" style="opacity: ${i === 0 ? 1 : 0}; transition: opacity 0.5s ease; position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; padding: 24px; border-radius: 16px; overflow: hidden; cursor: pointer; text-decoration: none;" data-path="${post.path}">
                        <div style="position: absolute; inset: 0; background-image: url('${post.thumbnail || ''}'); background-size: cover; background-position: center; filter: ${post.thumbnail ? 'brightness(0.7)' : 'brightness(0.9) grayscale(100%)'}; z-index: 0;"></div>
                        ${!post.thumbnail ? `<div style="position: absolute; inset: 0; background: linear-gradient(135deg, var(--md-sys-color-primary-container), var(--md-sys-color-secondary-container)); z-index: 0;"></div>` : ''}
                        <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%); z-index: 1;"></div>
                        <div style="position: relative; z-index: 2; color: white;">
                            <div style="font-size: 28px; font-weight: 800; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${post.title || post.name}</div>
                            <div style="font-size: 14px; font-weight: 400; opacity: 0.9; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${post.excerpt || ''}</div>
                        </div>
                    </div>
                `).join('');
                
                carouselHtml = `
                    <div class="home-carousel" style="position: relative; width: 100%; height: 300px; margin-bottom: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: var(--md-sys-color-surface-container);">
                        ${slides}
                        <div style="position: absolute; bottom: 16px; right: 24px; z-index: 3; display: flex; gap: 8px;" class="carousel-indicators">
                            ${carouselPosts.map((_, i) => `<div style="width: 8px; height: 8px; border-radius: 50%; background: white; opacity: ${i === 0 ? 1 : 0.5}; transition: opacity 0.3s;" data-index="${i}"></div>`).join('')}
                        </div>
                    </div>
                `;
                
                setTimeout(() => {
                    const slides = document.querySelectorAll('.carousel-slide');
                    const indicators = document.querySelectorAll('.carousel-indicators div');
                    let currentIndex = 0;
                    
                    function showSlide(index) {
                        slides.forEach((s, i) => s.style.opacity = i === index ? 1 : 0);
                        indicators.forEach((ind, i) => ind.style.opacity = i === index ? 1 : 0.5);
                    }
                    
                    if (slides.length > 1) {
                        if (window.homeCarouselInterval) clearInterval(window.homeCarouselInterval);
                        window.homeCarouselInterval = setInterval(() => {
                            currentIndex = (currentIndex + 1) % slides.length;
                            showSlide(currentIndex);
                        }, 5000);
                    }
                    
                    slides.forEach((slide) => {
                        slide.addEventListener('click', () => {
                            const targetPath = slide.getAttribute('data-path');
                            window.history.pushState({ path: targetPath }, '', '/?path=' + encodeURIComponent(targetPath));
                            loadContent(targetPath);
                        });
                    });
                    
                    // Feed logic
                    if (!path && allPosts) {
                        let feedIndex = 0;
                        const feedCount = 10;
                        const feedContainer = document.getElementById('all-posts-feed');
                        const loadMoreBtn = document.getElementById('load-more-btn');
                        
                        if (feedContainer && loadMoreBtn) {
                            function renderFeedItems() {
                                const nextPosts = allPosts.slice(feedIndex, feedIndex + feedCount);
                                if (nextPosts.length === 0) return;
                                
                                let html = nextPosts.map(child => {
                                    const icon = 'description';
                                    const fallbackStr = `<div style="width: 48px; height: 48px; flex-shrink: 0; display: flex; justify-content: center; align-items: center;"><md-icon style="color: var(--md-sys-color-primary);">${icon}</md-icon></div>`;
                                    const thumbnailHtml = child.thumbnail 
                                        ? `<div style="width: 48px; height: 48px; min-width: 48px; min-height: 48px; max-width: 48px; max-height: 48px; border-radius: 8px; overflow: hidden; flex-shrink: 0; display: flex; justify-content: center; align-items: center;"><img src="${child.thumbnail}" style="width: 48px; height: 48px; min-width: 48px; min-height: 48px; max-width: 48px; max-height: 48px; object-fit: cover; display: block;" onerror="this.outerHTML='<div style=\'width: 48px; height: 48px; display: flex; justify-content: center; align-items: center;\'><md-icon style=\'color: var(--md-sys-color-primary);\'>${icon}</md-icon></div>'"></div>` 
                                        : fallbackStr;
                                    
                                    const dateHtml = child.date
                                        ? `<div style="font-size: 12px; color: var(--md-sys-color-on-surface-variant); white-space: nowrap; margin-left: auto;">${child.date}</div>`
                                        : '';
                    
                                    const descriptionText = (child.excerpt || 'Document');
                                    
                                    return `
                                    <div class="list-item" data-path="${child.path}" style="display: flex; align-items: center; padding: 12px 16px; background: var(--md-sys-color-surface); border: 1px solid var(--md-sys-color-surface-variant); border-radius: 12px; cursor: pointer; transition: background 0.2s, transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.background='var(--md-sys-color-surface-variant)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.background='var(--md-sys-color-surface)'; this.style.transform='none'; this.style.boxShadow='none';">
                                        ${thumbnailHtml}
                                        <div style="margin-left: 16px; flex-grow: 1; min-width: 0;">
                                            <div style="font-weight: 600; font-size: 16px; color: var(--md-sys-color-on-surface); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${child.title || child.name}</div>
                                            <div style="font-size: 14px; color: var(--md-sys-color-on-surface-variant); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-height: 40px;">${descriptionText}</div>
                                        </div>
                                        ${dateHtml}
                                    </div>
                                    `;
                                }).join('');
                                
                                feedContainer.insertAdjacentHTML('beforeend', html);
                                feedIndex += feedCount;
                                
                                if (feedIndex >= allPosts.length) {
                                    loadMoreBtn.style.display = 'none';
                                }
                                
                                feedContainer.querySelectorAll('.list-item:not(.bound)').forEach(el => {
                                    el.classList.add('bound');
                                    el.addEventListener('click', () => {
                                        const targetPath = el.getAttribute('data-path');
                                        window.history.pushState({ path: targetPath }, '', '/?path=' + encodeURIComponent(targetPath));
                                        loadContent(targetPath);
                                    });
                                });
                            }
                            
                            renderFeedItems();
                            loadMoreBtn.addEventListener('click', renderFeedItems);
                        }
                    }
                }, 0);
            }
        }
    

        let listHtml = '';
        if (!path) {
            listHtml = `
            <style>
                  .home-carousel { height: 225px !important; z-index: 1; }
                  .home-layout-grid { grid-template-columns: 1fr !important; }
                  @media (min-width: 768px) { 
                      .home-layout-grid { 
                          grid-template-columns: 2fr 1fr !important; 
                          align-items: stretch !important; 
                      }
                      .home-carousel { 
                          height: 375px !important; 
                          margin-bottom: 0 !important;
                      }
                      .home-left, .home-right {
                          height: 375px;
                      }
                      .home-right { 
                          display: flex; 
                          flex-direction: column; 
                      }
                      .home-right .blog-list.directory-scroll {
                          flex-grow: 1;
                          max-height: none !important;
                          overflow-y: auto;
                          min-height: 0;
                          padding-right: 4px;
                      }
                  }
              </style>
            <div class="home-layout-grid" style="display: grid; gap: 32px; align-items: start;">
                <div class="home-left">
                    ${carouselHtml}
                </div>
                <div class="home-right">
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Directory</div>
                    <style>
                        .directory-scroll::-webkit-scrollbar { width: 6px; }
                        .directory-scroll::-webkit-scrollbar-track { background: transparent; }
                        .directory-scroll::-webkit-scrollbar-thumb { background: var(--md-sys-color-outline-variant); border-radius: 4px; }
                        .directory-scroll::-webkit-scrollbar-thumb:hover { background: var(--md-sys-color-outline); }
                    </style>
                    <div class="blog-list directory-scroll" style="display: flex; flex-direction: column; gap: 16px; max-height: 300px; overflow-y: auto; padding-right: 4px;">
            `;
        } else {
            listHtml = '<div class="blog-list" style="display: flex; flex-direction: column; gap: 16px;">';
        }
        
        if (folderNode && folderNode.children) {
            folderNode.children.forEach(child => {
                const childName = child.title || child.name;
                const icon = child.type === 'folder' ? 'folder' : 'description';
                const isFolder = child.type === 'folder';
                const clickPath = child.path;
                
                const fallbackStr = `<div style="width: 48px; height: 48px; flex-shrink: 0; display: flex; justify-content: center; align-items: center;"><md-icon style="color: var(--md-sys-color-primary);">${icon}</md-icon></div>`;
                const thumbnailHtml = child.thumbnail 
                    ? `<div style="width: 48px; height: 48px; min-width: 48px; min-height: 48px; max-width: 48px; max-height: 48px; border-radius: 8px; overflow: hidden; flex-shrink: 0; display: flex; justify-content: center; align-items: center;"><img src="${child.thumbnail}" style="width: 48px; height: 48px; min-width: 48px; min-height: 48px; max-width: 48px; max-height: 48px; object-fit: cover; display: block;" onerror="this.outerHTML='<div style=\\'width: 48px; height: 48px; display: flex; justify-content: center; align-items: center;\\'><md-icon style=\\'color: var(--md-sys-color-primary);\\'>${icon}</md-icon></div>'"></div>` 
                    : fallbackStr;
                
                const dateHtml = child.date
                    ? `<div style="font-size: 12px; color: var(--md-sys-color-on-surface-variant); white-space: nowrap; margin-left: auto;">${child.date}</div>`
                    : ``;

                const descriptionText = isFolder ? 'Folder' : (child.excerpt || 'Document');

                listHtml += `
                    <div class="blog-card folder-card-item" data-path="${clickPath}" style="padding: 16px; border-radius: 12px; border: 1px solid var(--md-sys-color-outline-variant); cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 16px;" onmouseover="this.style.background='var(--md-sys-color-surface-container)'" onmouseout="this.style.background='transparent'">
                        ${thumbnailHtml}
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 18px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${childName}</div>
                            <div style="font-size: 12px; color: var(--md-sys-color-on-surface-variant); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${descriptionText}</div>
                        </div>
                        ${dateHtml}
                    </div>
                `;
            });
        }
        
        if (folderNode && folderNode.children && folderNode.children.length === 0) {
            listHtml += `<div style="padding: 32px; text-align: center; color: var(--md-sys-color-on-surface-variant);">No posts have been written yet.</div>`;
        }
        
        listHtml += '</div>';
        
        if (!path) {
            listHtml += `
                </div>
            </div>
            
            <div class="home-bottom" style="margin-top: 48px;">
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 24px;">All Posts</div>
                <div id="all-posts-feed" style="display: flex; flex-direction: column; gap: 16px;"></div>
                <div style="text-align: center; margin-top: 24px;">
                    <md-filled-button id="load-more-btn" style="border-radius: 20px;">Load More</md-filled-button>
                </div>
            </div>
            `;
        }
        
        markdownContainer.innerHTML = breadcrumbsHtml + headerHtml + listHtml;
        
        markdownContainer.querySelectorAll('.breadcrumb-folder').forEach(el => {
            el.addEventListener('click', () => {
                const targetPath = el.getAttribute('data-path');
                window.history.pushState({ path: targetPath }, '', window.location.pathname + '?path=' + encodeURIComponent(targetPath));
                loadContent(targetPath);
            });
        });
        
        markdownContainer.querySelectorAll('.folder-card-item').forEach(el => {
            el.addEventListener('click', () => {
                const targetPath = el.getAttribute('data-path');
                window.history.pushState({ path: targetPath }, '', window.location.pathname + '?path=' + encodeURIComponent(targetPath));
                loadContent(targetPath);
            });
        });
        
        if (window.innerWidth <= 768) {
            sidebar.classList.add('hidden');
        }
    }

    async function loadContent(path) {
        if (!path) {
            loadHome('push');
            return;
        }
        
        currentPath = path;
        
        // Add loading state
        markdownContainer.innerHTML = '<div style="text-align: center; padding: 40px;"><md-circular-progress indeterminate></md-circular-progress></div>';

        const normalizedPath = path.endsWith('.md') ? path.slice(0, -3) : path;
        const node = findNodeInTree(normalizedPath, globalTreeData);
        if (node && node.type === 'folder' && !path.endsWith('.md')) {
            renderFolder(normalizedPath, node);
            return;
        }

        try {
            // Fetch raw markdown file directly
            const response = await fetch(`docs/${path}`);
            
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            
            const markdownText = await response.text();
            
            // Check for redirect macro: {{REDIRECT:target.md}}
            const redirectMatch = markdownText.match(/\{\{REDIRECT:([^}]+)\}\}/);
            if (redirectMatch) {
                const targetPath = redirectMatch[1].trim();
                if (path !== targetPath) {
                    window.history.replaceState({ path: targetPath }, '', `?path=${encodeURIComponent(targetPath)}`);
                    return loadContent(targetPath);
                }
            }

            currentMarkdown = markdownText;
            const lastModified = response.headers.get('Last-Modified') || null;
            
            // Re-render markdown body to trigger CSS animation
            markdownContainer.classList.remove('markdown-body');
            void markdownContainer.offsetWidth; // trigger reflow
            markdownContainer.classList.add('markdown-body');

            // Build Breadcrumbs
            const parts = path.replace(/\.md$/i, '').split('/');
            
            // 폴더 대표 파일일 경우 (예: US-5A/US-5A.md) 마지막 중복 이름 제거
            if (parts.length > 1 && parts[parts.length - 1] === parts[parts.length - 2]) {
                parts.pop();
            }

            let breadcrumbsHtml = `
                <div class="breadcrumbs" style="font-size: 14px; color: var(--md-sys-color-primary); margin-bottom: 24px; display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                    <span class="breadcrumb-home" style="cursor:pointer; display:flex; align-items:center; opacity:0.8; transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8">
                        <md-icon style="font-size: 16px; margin-right: 4px;">home</md-icon> Home 
                    </span>
            `;
            let currentFolderPath = '';
            parts.forEach((p, index) => {
                breadcrumbsHtml += `<md-icon style="font-size: 16px; opacity:0.5;">chevron_right</md-icon> `;
                if (index === parts.length - 1) {
                    // Current file (clickable)
                    breadcrumbsHtml += `<span class="breadcrumb-current" style="cursor:pointer; font-weight:500; opacity:0.8; transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8" title="Reload ${p}">${p}</span>`;
                } else {
                    currentFolderPath += (currentFolderPath ? '/' : '') + p;
                    // Folder (clickable)
                    breadcrumbsHtml += `<span class="breadcrumb-folder" data-path="${currentFolderPath}" style="cursor:pointer; opacity:0.7; transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7" title="Load folder ${p}">${p}</span>`;
                }
            });
            breadcrumbsHtml += `</div>`;

            // Parse markdown to HTML using Marked.js after applying macros
            const processedText = processTimeMacros(markdownText);
            
            // Blog Post Header Logic
            let title = path.split('/').pop().replace('.md', '');
            let category = path.split('/').slice(0, -1).join(' / ') || 'Home';
            let contentToParse = processedText;
            let postAuthor = globalConfig.authorName || 'Admin';
            let postDate = '';
            
            // Extract frontmatter
            const fmMatch = contentToParse.match(/^---\n([\s\S]*?)\n---/);
            if (fmMatch) {
                const fm = fmMatch[1];
                const authorMatch = fm.match(/^author:\s*(.+)$/m);
                if (authorMatch) postAuthor = authorMatch[1].trim();
                const dateMatch = fm.match(/^date:\s*(.+)$/m);
                if (dateMatch) postDate = dateMatch[1].trim();
                
                contentToParse = contentToParse.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
            }

            const titleMatch = contentToParse.match(/^#\s+(.+)$/m);
            if (titleMatch && contentToParse.indexOf(titleMatch[0]) < 10) {
                title = titleMatch[1];
                contentToParse = contentToParse.replace(titleMatch[0], '').trim();
            }
            
            const dateHtml = postDate ? `
                <div style="display: flex; align-items: center; gap: 4px; margin-left: 8px;">
                    <md-icon style="font-size: 18px;">calendar_today</md-icon>
                    <span>${postDate}</span>
                </div>
            ` : '';

            const headerHtml = `
                <div class="blog-header" style="margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid var(--md-sys-color-surface-variant); animation: fadeIn 0.3s ease;">
                    <div style="font-size: 14px; color: var(--md-sys-color-primary); font-weight: 500; margin-bottom: 8px;">${category}</div>
                    <h1 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 700; line-height: 1.3;">${title}</h1>
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--md-sys-color-on-surface-variant);">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <md-icon style="font-size: 18px;">person</md-icon>
                            <span>${postAuthor}</span>
                        </div>
                        ${dateHtml}
                    </div>
                </div>
            `;
            
            markdownContainer.innerHTML = breadcrumbsHtml + headerHtml + marked.parse(contentToParse);

            // Wrap tables in responsive divs for mobile horizontal scrolling
            markdownContainer.querySelectorAll('table').forEach(table => {
                const wrapper = document.createElement('div');
                wrapper.style.overflowX = 'auto';
                wrapper.style.maxWidth = '100%';
                wrapper.style.marginBottom = '24px';
                wrapper.style.WebkitOverflowScrolling = 'touch';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
                table.style.marginBottom = '0'; // Remove inner margin
            });

            // Bind breadcrumb click listeners
            markdownContainer.querySelectorAll('.breadcrumb-folder').forEach(el => {
                el.addEventListener('click', () => {
                    const targetPath = el.getAttribute('data-path');
                    window.history.pushState({ path: targetPath }, '', window.location.pathname + '?path=' + encodeURIComponent(targetPath));
                    loadContent(targetPath);
                });
            });
            const homeCrumb = markdownContainer.querySelector('.breadcrumb-home');
            if (homeCrumb) {
                homeCrumb.addEventListener('click', () => {
                    window.history.pushState({ path: '' }, '', window.location.pathname);
                    loadContent('');
                });
            }

            // SPA routing for internal markdown links
            markdownContainer.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href');
                if (href && href.includes('?path=')) {
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        const targetPath = new URLSearchParams(href.split('?')[1]).get('path');
                        if (targetPath) {
                            window.history.pushState({ path: targetPath }, '', href);
                            loadContent(targetPath);
                            currentPath = targetPath;
                            loadTree();
                        }
                    });
                }
            });

            // Add click listeners to breadcrumbs
            const homeLink = markdownContainer.querySelector('.breadcrumb-home');
            if (homeLink) {
                homeLink.addEventListener('click', () => {
                    window.history.pushState({ path: '' }, '', window.location.pathname);
                    loadHome('replace');
                });
            }
            
            const currentLink = markdownContainer.querySelector('.breadcrumb-current');
            if (currentLink) {
                currentLink.addEventListener('click', () => {
                    loadContent(path);
                });
            }

            markdownContainer.querySelectorAll('.breadcrumb-folder').forEach(el => {
                el.addEventListener('click', () => {
                    const targetPath = el.getAttribute('data-path');
                    window.history.pushState({ path: targetPath }, '', window.location.pathname + '?path=' + encodeURIComponent(targetPath));
                    loadContent(targetPath);
                    currentPath = targetPath;
                    loadTree();
                });
            });

            if (typeof buildTOC === 'function') buildTOC();

            if (lastModified) {
                const date = new Date(lastModified);
                const dateStr = date.toLocaleString();
                const footerHtml = `
                    <div style="margin-top: 48px; padding-top: 16px; border-top: 1px dashed var(--md-sys-color-outline-variant); font-size: 13px; color: var(--md-sys-color-on-surface-variant); text-align: right;">
                        Last updated: ${dateStr}
                    </div>
                `;
                markdownContainer.insertAdjacentHTML('beforeend', footerHtml);
            }

            // Scroll to top
            document.getElementById('main-content').scrollTop = 0;

        } catch (error) {
            console.error('Failed to load content:', error);
            markdownContainer.innerHTML = `
                <div style="text-align:center; padding: 40px;">
                    <md-icon style="font-size: 48px; color: var(--md-sys-color-error);">error</md-icon>
                    <h2>Document Not Found</h2>
                    <p>The document you are looking for might have been removed or renamed.</p>
                </div>
            `;
        }
    }

    // Handle browser back/forward navigation
    window.addEventListener('popstate', (event) => {
        const path = new URLSearchParams(window.location.search).get('path');
        if (path) {
            loadContent(path);
            
            // Re-fetch tree to update active state and open folders
            currentPath = path;
            loadTree();
        } else {
            loadHome('none');
            loadTree();
        }
    });

    // Initial Load
    loadSettings();
    loadTree();
    if (currentPath) {
        loadContent(currentPath);
    }

    // Header buttons logic
    const searchBtn = document.getElementById('search-btn');
    const searchDialog = document.getElementById('search-dialog');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const closeSearchBtn = document.getElementById('close-search-btn');

    document.getElementById('app-title').addEventListener('click', () => {
        loadHome('push');
    });

    searchBtn.addEventListener('click', () => {
        triggerIconAnim('search-btn', 'icon-anim-pop');
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchDialog.show();
        setTimeout(() => searchInput.focus(), 100);
    });

    closeSearchBtn.addEventListener('click', () => {
        searchDialog.close();
    });

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (!query) {
            searchResults.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            searchResults.innerHTML = '<div style="padding:16px; text-align:center;">Searching...</div>';
            try {
                const res = await fetch('search_index.json', { cache: 'no-store' });
                const allData = await res.json();
                
                const qLower = query.toLowerCase();
                const data = allData.filter(item => 
                    item.name.toLowerCase().includes(qLower) || 
                    item.content.toLowerCase().includes(qLower)
                ).map(item => {
                    // Create snippet
                    const matchIdx = item.content.toLowerCase().indexOf(qLower);
                    let snippet = '';
                    if (matchIdx !== -1) {
                        const start = Math.max(0, matchIdx - 40);
                        const end = Math.min(item.content.length, matchIdx + query.length + 40);
                        snippet = (start > 0 ? '...' : '') + item.content.substring(start, end).replace(/</g, '&lt;') + (end < item.content.length ? '...' : '');
                    }
                    return { ...item, snippet };
                }).slice(0, 20);
                
                if (data.length === 0) {
                    searchResults.innerHTML = '<div style="padding:16px; text-align:center;">No results found.</div>';
                    return;
                }

                searchResults.innerHTML = data.map(item => `
                    <div class="search-result-item" data-path="${item.path}" style="padding: 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s;">
                        <div style="font-weight: 500; display:flex; align-items:center; gap:8px;">
                            <md-icon style="font-size:18px;">description</md-icon>
                            ${item.name}
                        </div>
                        <div style="font-size: 12px; color: var(--md-sys-color-on-surface-variant); margin-top: 4px;">
                            ${item.snippet}
                        </div>
                    </div>
                `).join('');

                // Add hover style and click listeners
                document.querySelectorAll('.search-result-item').forEach(el => {
                    el.addEventListener('mouseover', () => el.style.backgroundColor = 'var(--md-sys-color-surface-container-high)');
                    el.addEventListener('mouseout', () => el.style.backgroundColor = 'transparent');
                    el.addEventListener('click', () => {
                        searchDialog.close();
                        const path = el.getAttribute('data-path');
                        
                        // Navigate
                        currentPath = path;
                        const newUrl = new URL(window.location);
                        newUrl.searchParams.set('path', path);
                        window.history.pushState({ path }, '', newUrl);
                        loadContent(path);
                        loadTree();
                    });
                });
            } catch(e) {
                searchResults.innerHTML = '<div style="padding:16px; text-align:center; color: var(--md-sys-color-error);">Search failed.</div>';
            }
        }, 300);
    });

    document.getElementById('random-btn').addEventListener('click', () => {
        triggerIconAnim('random-btn', 'icon-anim-pop');
        const files = [];
        function extractFiles(items) {
            items.forEach(item => {
                if (item.type === 'file') files.push(item);
                else if (item.type === 'folder' && item.children) extractFiles(item.children);
            });
        }
        extractFiles(globalTreeData);
        
        if (files.length > 0) {
            const randomFile = files[Math.floor(Math.random() * files.length)];
            
            // Update URL and Load content
            currentPath = randomFile.path;
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('path', randomFile.path);
            window.history.pushState({ path: randomFile.path }, '', newUrl);
            
            loadContent(randomFile.path);
            
            // Re-fetch tree to update active state and open folders
            loadTree();
        } else {
            alert('No documents found.');
        }
    });

    // --- Settings and Uploads ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDialog = document.getElementById('settings-dialog');
    const themeModeSelect = document.getElementById('theme-mode-select');
    const colorPickerTrigger = document.getElementById('color-picker-trigger');
    const colorPaletteMenu = document.getElementById('color-palette-menu');
    const customHexInput = document.getElementById('custom-hex-input');
    const colorChips = document.querySelectorAll('.color-chip');
    const nativeColorPicker = document.getElementById('native-color-picker');
    const colorValue = document.getElementById('color-value');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    let currentSettings = { primaryColor: '#6750A4', themeMode: 'system', darkModeStart: '18:00', darkModeEnd: '06:00' };
    let globalConfig = { siteTitle: 'DB-less Wiki', homeDocument: '', faviconUrl: '', customFontUrl: '', customFont: '', authorName: 'Admin' };
    const appTitle = document.getElementById('app-title');
    const pageTitle = document.getElementById('page-title');
    const pageFavicon = document.getElementById('page-favicon');

    function updateTheme() {
        const isDark = getIsDark(currentSettings.themeMode || 'system');
        
        // Apply data-theme for any custom CSS rules we have
        if (currentSettings.themeMode === 'light' || currentSettings.themeMode === 'dark') {
            document.documentElement.setAttribute('data-theme', currentSettings.themeMode);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        // Use material-color-utilities to generate the full tonal palette
        const theme = themeFromSourceColor(argbFromHex(currentSettings.primaryColor || '#6750A4'));
        applyTheme(theme, { target: document.documentElement, dark: isDark });
        
        // Ensure color-scheme is set for native elements (scrollbars, etc)
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    }

    function getIsDark(mode) {
        if (mode === 'dark') return true;
        if (mode === 'light') return false;
        if (mode === 'schedule') {
            const start = currentSettings.darkModeStart || '18:00';
            const end = currentSettings.darkModeEnd || '06:00';
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const parseTime = (t) => {
                const parts = t.split(':');
                return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            };
            const startMins = parseTime(start);
            const endMins = parseTime(end);
            
            if (startMins <= endMins) {
                return currentMins >= startMins && currentMins < endMins;
            } else {
                return currentMins >= startMins || currentMins < endMins;
            }
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Re-evaluate theme every 1 minute
    setInterval(() => {
        if (currentSettings.themeMode === 'schedule' || currentSettings.themeMode === 'system') {
            updateTheme();
        }
    }, 60000);

    // Listen for OS theme changes if in system mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!currentSettings.themeMode || currentSettings.themeMode === 'system') {
            updateTheme();
        }
    });

    themeModeSelect.addEventListener('change', (e) => {
        currentSettings.themeMode = e.target.value;
        const scheduleGroup = document.getElementById('theme-schedule-group');
        if (scheduleGroup) {
            scheduleGroup.style.display = e.target.value === 'schedule' ? 'flex' : 'none';
        }
        updateTheme();
    });

    // Custom Color Picker Logic
    colorPickerTrigger.addEventListener('click', () => {
        customHexInput.value = currentSettings.primaryColor || '#6750A4';
        colorPaletteMenu.open = true;
        
        setTimeout(() => {
            if (colorPaletteMenu.shadowRoot) {
                const sheet = new CSSStyleSheet();
                sheet.replaceSync('* { backdrop-filter: blur(10px) !important; -webkit-backdrop-filter: blur(10px) !important; }');
                const sheets = [...colorPaletteMenu.shadowRoot.adoptedStyleSheets];
                if (!sheets.some(s => s.cssRules.length > 0 && s.cssRules[0].cssText.includes('blur(10px)'))) {
                    colorPaletteMenu.shadowRoot.adoptedStyleSheets = [...sheets, sheet];
                }
            }
        }, 50);
    });

    function applyColorSelection(hexColor) {
        colorValue.textContent = hexColor;
        currentSettings.primaryColor = hexColor;
        document.getElementById('color-picker-preview').style.backgroundColor = hexColor;
        updateTheme();
    }

    colorChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            const hexColor = e.target.getAttribute('data-color');
            customHexInput.value = hexColor;
            applyColorSelection(hexColor);
            colorPaletteMenu.open = false;
        });
    });

    nativeColorPicker.addEventListener('input', (e) => {
        const hex = e.target.value;
        customHexInput.value = hex;
        applyColorSelection(hex);
    });

    customHexInput.addEventListener('input', (e) => {
        const hex = e.target.value;
        if (/^#[0-9A-F]{6}$/i.test(hex)) {
            applyColorSelection(hex);
        }
    });

    settingsBtn.addEventListener('click', async () => {
        triggerIconAnim('settings-btn', 'icon-anim-gear');
        const currentColor = currentSettings.primaryColor || '#6750A4';
        colorValue.textContent = currentColor;
        document.getElementById('color-picker-preview').style.backgroundColor = currentColor;
        customHexInput.value = currentColor;
        themeModeSelect.value = currentSettings.themeMode || 'system';
        const scheduleGroup = document.getElementById('theme-schedule-group');
        if (scheduleGroup) {
            scheduleGroup.style.display = themeModeSelect.value === 'schedule' ? 'flex' : 'none';
        }
        document.getElementById('dark-mode-start').value = currentSettings.darkModeStart || '18:00';
        document.getElementById('dark-mode-end').value = currentSettings.darkModeEnd || '06:00';

        settingsDialog.show();
    });

    async function loadSettings() {
        try {
            const res = await fetch('settings.json', { cache: 'no-store' });
            globalConfig = Object.assign(globalConfig, await res.json());
        } catch(e) {}
        
        try {
            const localConfig = JSON.parse(localStorage.getItem('siteConfig'));
            if (localConfig) {
                currentSettings.primaryColor = localConfig.primaryColor || currentSettings.primaryColor;
                currentSettings.themeMode = localConfig.themeMode || currentSettings.themeMode;
                currentSettings.darkModeStart = localConfig.darkModeStart || currentSettings.darkModeStart;
                currentSettings.darkModeEnd = localConfig.darkModeEnd || currentSettings.darkModeEnd;
            }
        } catch(e) {}

        if (globalConfig.customFontUrl) applyFont(globalConfig.customFont, globalConfig.customFontUrl);
        applySiteTitle(globalConfig.siteTitle);
        applyFavicon(globalConfig.faviconUrl);
        updateTheme();
    }

    function applySiteTitle(title) {
        const t = title || 'DB-less Wiki';
        appTitle.textContent = t;
        pageTitle.textContent = t;
    }

    function applyFavicon(url) {
        const appleIcon = document.getElementById('page-apple-icon');
        if (url) {
            pageFavicon.href = url;
            if (appleIcon) appleIcon.href = url;
        } else {
            pageFavicon.removeAttribute('href');
            if (appleIcon) appleIcon.removeAttribute('href');
        }
    }

    function applyFont(fontName, fontUrl) {
        if (!fontUrl) return;
        const newStyle = document.createElement('style');
        newStyle.appendChild(document.createTextNode(`
            @font-face {
                font-family: '${fontName}';
                src: url('${fontUrl}');
            }
            :root {
                --md-ref-typeface-brand: '${fontName}', 'Roboto', system-ui, sans-serif !important;
                --md-ref-typeface-plain: '${fontName}', 'Roboto', system-ui, sans-serif !important;
            }
            * {
                font-family: '${fontName}', 'Roboto', system-ui, sans-serif;
            }
            md-icon, .material-symbols-outlined {
                font-family: 'Material Symbols Outlined' !important;
            }
        `));
        document.head.appendChild(newStyle);
    }

    saveSettingsBtn.addEventListener('click', async () => {
        currentSettings.primaryColor = customHexInput.value;
        currentSettings.themeMode = themeModeSelect.value;
        currentSettings.darkModeStart = document.getElementById('dark-mode-start').value || '18:00';
        currentSettings.darkModeEnd = document.getElementById('dark-mode-end').value || '06:00';
        updateTheme();

        // Save settings to local storage
        try {
            localStorage.setItem('siteConfig', JSON.stringify(currentSettings));
            settingsDialog.close();
        } catch (e) {
            console.error('Failed to save settings', e);
            alert('Failed to save settings.');
        }
    });



    // Record last clicked coordinate for dialog pop origin
    let lastClickX = 0;
    let lastClickY = 0;
    document.addEventListener('click', (e) => {
        if (e.target.closest('md-icon-button') || e.target.closest('md-filled-tonal-button')) {
            const rect = e.target.closest('md-icon-button, md-filled-tonal-button').getBoundingClientRect();
            lastClickX = rect.left + rect.width / 2;
            lastClickY = rect.top + rect.height / 2;
        }
    }, { capture: true });

    // Inject Blur styling into MD3 Dialogs and Menus
    document.querySelectorAll('md-dialog, md-menu, md-outlined-select').forEach(el => {
        customElements.whenDefined(el.localName).then(() => {
            if (el.shadowRoot) {
                const style = document.createElement('style');
                style.textContent = `
                    .dialog, dialog, .menu, md-menu {
                        backdrop-filter: blur(10px) !important;
                        -webkit-backdrop-filter: blur(10px) !important;
                        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25) !important;
                    }
                    .scrim {
                        display: none !important;
                    }
                    ::-webkit-scrollbar {
                        display: none !important;
                    }
                    * {
                        scrollbar-width: none !important;
                        -ms-overflow-style: none !important;
                    }
                `;
                el.shadowRoot.appendChild(style);

                // Handle nested md-menu inside md-outlined-select
                if (el.localName.includes('select')) {
                    const injectNested = () => {
                        const internalMenu = el.shadowRoot.querySelector('md-menu');
                        if (internalMenu && internalMenu.shadowRoot) {
                            const style2 = document.createElement('style');
                            style2.textContent = `
                                .menu, .surface, .container {
                                    backdrop-filter: blur(10px) !important;
                                    -webkit-backdrop-filter: blur(10px) !important;
                                    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25) !important;
                                }
                            `;
                            internalMenu.shadowRoot.appendChild(style2);
                        } else if (internalMenu) {
                            setTimeout(injectNested, 50); // Wait for shadow root attachment
                        }
                    };
                    injectNested();
                }
            }
        });
    });

    // Custom Mobile-App Style Pop Animations for Dialogs (Intercepts the 'quick' instant open)
    document.querySelectorAll('md-dialog').forEach(mdDialog => {
        // Override the close method to inject our animation
        const originalClose = mdDialog.close.bind(mdDialog);
        mdDialog.close = async function(returnValue) {
            if (this.open && !this._isClosing) {
                this._isClosing = true;
                await playCloseAnim(this);
                originalClose(returnValue);
                this._isClosing = false;
            } else if (!this.open && !this._isClosing) {
                originalClose(returnValue);
            }
        };
        mdDialog.addEventListener('open', () => {
            const nativeDialog = mdDialog.shadowRoot.querySelector('.dialog') || mdDialog.shadowRoot.querySelector('dialog');
            
            if (nativeDialog) {
                try { nativeDialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease-out', pseudoElement: '::backdrop' }); } catch (e) {}
                
                // Hide instantly to prevent a 1-frame center flash before layout completes
                nativeDialog.style.opacity = '0';
                
                requestAnimationFrame(() => {
                    const rect = nativeDialog.getBoundingClientRect();
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    const tx = (lastClickX || cx) - cx;
                    const ty = (lastClickY || cy) - cy;

                    const anim = nativeDialog.animate([
                        { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 },
                        { transform: 'translate(0, 0) scale(1)', opacity: 1 }
                    ], { 
                        duration: 300, 
                        easing: 'cubic-bezier(0.0, 0.0, 0.2, 1)' // Smooth decel, no bounce
                    });
                    
                    anim.onfinish = () => { nativeDialog.style.opacity = ''; };
                });
            }
        });

        // Intercept cancel event (Escape key or scrim click)
        mdDialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            mdDialog.close(); // Triggers our overridden close with animation
        });
    });

    async function playCloseAnim(mdDialog) {
        const nativeDialog = mdDialog.shadowRoot.querySelector('.dialog') || mdDialog.shadowRoot.querySelector('dialog');
        const scrim = mdDialog.shadowRoot.querySelector('.scrim');
        let animFinished = Promise.resolve();

        if (scrim) {
            const currentOpacity = getComputedStyle(scrim).opacity || 0.32;
            scrim.animate([{ opacity: currentOpacity }, { opacity: 0 }], { duration: 250, easing: 'ease-in' });
        }
        
        if (nativeDialog) {
            try { nativeDialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease-in', pseudoElement: '::backdrop' }); } catch (e) {}

            const rect = nativeDialog.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const tx = (lastClickX || cx) - cx;
            const ty = (lastClickY || cy) - cy;

            const anim = nativeDialog.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], { 
                duration: 250, 
                easing: 'cubic-bezier(0.2, 0, 0, 1)' 
            });
            animFinished = anim.finished;
        }
        await animFinished;
    }

    // Note: form[method="dialog"] submissions are now handled naturally because 
    // MWC md-dialog internally calls .close(), which we have overridden above.

    // Scroll to Top and Pill FAB Logic
    const pillFabContainer = document.querySelector('.pill-fab-container');
    const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
    const mainContentArea = document.getElementById('main-content');
    const tocFabBtn = document.getElementById('toc-fab-btn');
    const mobileTocPopover = document.getElementById('mobile-toc-popover');
    const mobileTocContent = document.getElementById('mobile-toc-content');
    const closeMobileTocBtn = document.getElementById('close-mobile-toc-btn');

    if (pillFabContainer && mainContentArea) {
        mainContentArea.addEventListener('scroll', () => {
            if (mainContentArea.scrollTop > 10) {
                pillFabContainer.classList.remove('hidden');
            } else {
                pillFabContainer.classList.add('hidden');
            }
        });

        if (scrollToTopBtn) {
            scrollToTopBtn.addEventListener('click', () => {
                mainContentArea.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    if (tocFabBtn && mobileTocPopover) {
        tocFabBtn.addEventListener('click', () => {
            mobileTocPopover.classList.toggle('hidden');
        });
        
        if (closeMobileTocBtn) {
            closeMobileTocBtn.addEventListener('click', () => {
                mobileTocPopover.classList.add('hidden');
            });
        }
    }

    // TOC Builder
    window.buildTOC = function() {
        const headings = Array.from(markdownContainer.querySelectorAll('h2, h3'));
        
        if (headings.length === 0) {
            if (tocFabBtn) tocFabBtn.style.display = 'none';
            return;
        }

        if (tocFabBtn) tocFabBtn.style.display = 'flex';
        
        let tocHtml = '<div class="toc-heading">Table of Contents</div>';
        
        headings.forEach((h, index) => {
            // Assign IDs to headings if they don't have one
            if (!h.id) {
                h.id = 'heading-' + index;
            }
            const levelClass = h.tagName.toLowerCase() === 'h2' ? 'toc-h2' : 'toc-h3';
            tocHtml += `<a href="#${h.id}" class="toc-link ${levelClass}" title="${h.textContent}">${h.textContent}</a>`;
        });
        
        if (mobileTocContent) mobileTocContent.innerHTML = tocHtml;

        // Add smooth scroll for TOC links
        document.querySelectorAll('.toc-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    mainContentArea.scrollTo({
                        top: targetEl.offsetTop - 20,
                        behavior: 'smooth'
                    });
                    if (mobileTocPopover) {
                        mobileTocPopover.classList.add('hidden');
                    }
                }
            });
        });
    };

    // Initial Load
    async function init() {
        await loadSettings();
        await loadTree();

        if (currentPath) {
            loadContent(currentPath);
        } else {
            loadHome('replace');
        }
    }
    
    init();
});
