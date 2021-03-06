/* **************************************************************

   Copyright 2013 Zoovy, Inc.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

************************************************************** */



var admin_sites = function(_app) {
	
	var theseTemplates = new Array(
		"domainListTemplate",
		"domainListHostsRowTemplate",
		"sitesDomainRowTemplate"
/*	
used, but not pre-loaded.	
	"domainAndAppConfigTemplate"

*/
		);
	
	var r = {


////////////////////////////////////   CALLBACKS    \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\



		callbacks : {
	//executed when extension is loaded. should include any validation that needs to occur.
			init : {
				onSuccess : function()	{
					var r = false; //return false if extension won't load for some reason (account config, dependencies, etc).
					_app.model.fetchNLoadTemplates(_app.vars.baseURL+'extensions/admin/sites.html',theseTemplates);
					_app.rq.push(['css',0,_app.vars.baseURL+'extensions/admin/sites.css','sites_styles']);
					//if there is any functionality required for this extension to load, put it here. such as a check for async google, the FB object, etc. return false if dependencies are not present. don't check for other extensions.
					r = true;

					return r;
					},
				onError : function()	{
	//errors will get reported for this callback as part of the extensions loading.  This is here for extra error handling purposes.
	//you may or may not need it.
					_app.u.dump('BEGIN admin_orders.callbacks.init.onError');
					}
				}
			}, //callbacks



////////////////////////////////////   ACTION    \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

		a : {
			
			
//The sites interface should always be opened in the sites tab.
			showSitesTab : function()	{
				var $target = $("#sitesContent").intervaledEmpty().showLoading({'message':'Fetching List of Domains'}).anyform();
				_app.u.addEventDelegation($target);
				if(_app.ext.admin.vars.tab != 'sites')	{
					_app.ext.admin.u.bringTabIntoFocus('sites');
					_app.ext.admin.u.bringTabContentIntoFocus($target);
					}
				
//if domains are not already in memory, get a new partition list too. that way the callback isn't executed before the domains are available.
				_app.model.addDispatchToQ({
					'_cmd':'adminDomainList',
					'hosts' : 1,
					'_tag':	{
						'datapointer' : 'adminDomainList',
						'callback':function(rd)	{
							if(_app.model.responseHasErrors(rd)){
								$('#globalMessaging').anymessage({'message':rd});
								}
							else	{
								$target.hideLoading();
								var domains = _app.data[rd.datapointer]['@DOMAINS'];
								_app.data[rd.datapointer]['*favorites'] = new Array();
								var L = domains.length;
								for(var i = 0; i < L; i += 1)	{
									if(domains[i].IS_FAVORITE == 1)	{
										_app.data[rd.datapointer]['*favorites'].push(domains[i]);
										}
									}
								$target.anycontent({'templateID':'pageTemplateSites','datapointer':rd.datapointer});
								_app.u.handleButtons($target);
								}
							}
						}
					},'mutable');
				_app.model.dispatchThis('mutable');


				},
			
			
			showDomainConfig : function($target)	{
				$target.anycontent({'templateID':'domainAndAppConfigTemplate','showLoading':false}).anyform();
				_app.u.addEventDelegation($target);
				_app.ext.admin_sites.u.fetchSiteTabData($target,'mutable');
				_app.u.handleButtons($target);
				_app.model.dispatchThis('mutable');
				}
			
			}, //Actions

////////////////////////////////////   RENDERFORMATS    \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

//renderFormats are what is used to actually output data.
//on a data-bind, format: is equal to a renderformat. extension: tells the rendering engine where to look for the renderFormat.
//that way, two render formats named the same (but in different extensions) don't overwrite each other.
		renderFormats : {
				projectID2Pretty : function($tag,data)	{
					var o = data.value; //what will be Output into $tag. Defaults to project id (which is what should be in data.value
					if(_app.data.adminProjectList && _app.data.adminProjectList['@PROJECTS'])	{
						var index = _app.ext.admin.u.getIndexInArrayByObjValue(_app.data.adminProjectList['@PROJECTS'],'UUID',data.value);
						if(index === 0 || index >= 1)	{
							if(_app.data.adminProjectList['@PROJECTS'][index].TITLE)	{
								o = _app.data.adminProjectList['@PROJECTS'][index].TITLE;
								}
							}
						}
					$tag.text(o);
					},

				projectButtons : function($tag,data)	{
					var $menu = $("<menu \/>").addClass('projectMenu').hide();
					$tag.css('position','relative');  //so menu appears where it should.
					if(data.value.GITHUB_REPO)	{
						$menu.append("<li><a href='#' data-app-click='admin|linkOffSite' data-url='"+data.value.GITHUB_REPO+"'>Visit GitHub Repository<\/a><\/li>");
						}
					if(data.value.LINK)	{
						$menu.append("<li><a href='#' data-app-click='admin|linkOffSite' data-url='"+data.value.LINK+"'>Visit GitHub Repository<\/a><\/li>");
						}
					$menu.append("<li><a href='#' data-app-click='admin_sites|projectRemove'>Remove this Project<\/a><\/li>");

					$menu.menu();
					$tag.append($menu);
					$menu.css({'position':'absolute','width':200,'z-index':200,'top':25,'right':0});
					var $button = $("<button>").text("App Related Utilities").button({icons: {primary: "ui-icon-wrench",secondary: "ui-icon-triangle-1-s"},text: false});
					$button.on('click',function(){
						$menu.closest('table').find('menu.projectMenu').hide(); //close any open menus.
						$menu.show();
						$( document ).one( "click", function() {
							$menu.hide();
							});
						return false;
						})
					$tag.append($button);
					},

				//pass in HOSTTYPE as data.
				appHostButtons : function($tag,data)	{
					var $menu = $("<menu \/>").addClass('appHostMenu').hide();
					$tag.css('position','relative');  //so menu appears where it should.

					if(data.value.HOSTTYPE == 'APPTIMIZER' || data.value.HOSTTYPE == 'VSTORE-APP')	{
						$menu.append("<li><a href='#' data-app-click='admin_sites|adminSEOInitExec'>Get SEO Token</a></li>");

						if(data.value.PROJECT && data.value.PROJECT.indexOf(data.value.HOSTNAME.toLowerCase()) >= 0)	{
// * 201401 -> currently, 'choose template' is in the host editor if host type == aptimizer and 'template' is selected.
//							$menu.append("<li><a href='#' data-app-click='admin_template|templateChooserShow' data-mode='Site'>Choose a Template</a></li>");
							$menu.append("<li><a href='#' data-app-click='admin_template|templateEditorShow' data-mode='Site'>Edit Project</a></li>");
							$menu.append("<li data-app-click='admin_template|containerFileUploadShow' data-mode='Site'><a href='#'>Upload Template Files</a></li>");
							}
						else	{
							$menu.append("<li><a href='#' data-app-click='admin_batchjob|adminBatchJobExec' data-whitelist='PROJECT' data-type='UTILITY/GITPULL'>Pull from GitHub</a></li>");
							$menu.append("<li><a href='#' data-app-click='admin_batchjob|adminBatchJobExec' data-type='EXPORT/PAGES' >Export Pages.json</a></li>");
							$menu.append("<li><a href='#' data-app-click='admin_batchjob|adminBatchJobExec' data-type='EXPORT/APPRESOURCE' >Export App Resource Zip</a></li>");
							}
						}
					if($menu.children().length)	{
						$menu.menu();
						$tag.append($menu); //so menu appears where it should.
						$menu.css({'position':'absolute','width':200,'z-index':200,'top':25,'right':0});
						var $button = $("<button>").text("App Related Utilities").button({icons: {primary: "ui-icon-wrench",secondary: "ui-icon-triangle-1-s"},text: false});
						$button.on('click',function(){
							$menu.closest('table').find('menu.appHostMenu').hide(); //close any open menus.
							$menu.show();
							$( document ).one( "click", function() {
								$menu.hide();
								});
							return false;
							})
						$tag.append($button);
						}
					else	{
						//host/domain isn't app based.
						}
					}

			}, //renderFormats


		macrobuilders : {


			//executed from within the 'create new domain' interface.
			adminDomainMacroCreate : function(sfo,$form)	{
				sfo = sfo || {};
//a new object, which is sanitized and returned.
				var newSfo = {
					'_cmd':'adminDomainMacro',
					'_tag':sfo._tag,
					'@updates':[]
					};
				if(sfo.domaintype == 'DOMAIN-DELEGATE')	{
					newSfo.DOMAINNAME = sfo.DOMAINNAME;
					newSfo['@updates'].push("DOMAIN-DELEGATE");
					}
				else if(sfo.domaintype == 'DOMAIN-RESERVE')	{
					newSfo['@updates'].push("DOMAIN-RESERVE")					
					}
				else	{
					newSfo = false;
					}
				return newSfo;
				},

			//executed when save is pressed within the general panel of editing a domain.
			adminDomainMacroGeneral : function(sfo,$form)	{
				sfo = sfo || {};
//a new object, which is sanitized and returned.
				var newSfo = {
					'_cmd':'adminDomainMacro',
					'DOMAINNAME':sfo.DOMAINNAME,
					'_tag':sfo._tag,
					'@updates': new Array()
					};
				
				newSfo['@updates'].push("DOMAIN-SET-PRIMARY?IS="+sfo.IS_PRIMARY);
				newSfo['@updates'].push("DOMAIN-SET-SYNDICATION?IS="+sfo.IS_SYNDICATION);
			
				if($("[data-app-role='emailConfigContainer'] .edited",$form).length)	{
					newSfo['@updates'].push("EMAIL-SET?"+$.param(_app.u.getWhitelistedObject($("[data-app-role='emailConfigContainer']").serializeJSON(),['MX1','MX2','TYPE'])));
					}
				
				
				if($("input[name='LOGO']",$form).hasClass('edited'))	{
					newSfo['@updates'].push("DOMAIN-SET-LOGO?LOGO="+sfo.LOGO || ""); //set to value of LOGO. if not set, set to blank (so logo can be cleared).
					}					

				if($("input[name='IS_FAVORITE']",$form).hasClass('edited'))	{
					newSfo['@updates'].push("DOMAIN-SET-FAVORITE?IS="+sfo.IS_FAVORITE);
					}				
				
				if($("select[name='PRT']",$form).hasClass('edited'))	{
					newSfo['@updates'].push("DOMAIN-SET-PRT?PRT="+sfo.PRT);
					}
				
				$("[data-app-role='domainsHostsTbody'] tr",$form).each(function(){
					if($(this).hasClass('rowTaggedForRemove'))	{
						newSfo['@updates'].push("HOST-KILL?HOSTNAME="+$(this).data('hostname'));
						}
					else	{} //do nothing. new hosts are added in modal.
					});
//				_app.u.dump(" -> new sfo for domain macro general: "); _app.u.dump(newSfo);
				return newSfo;
				}

			},


////////////////////////////////////   UTIL [u]   \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

//utilities are typically functions that are exected by an event or action.
//any functions that are recycled should be here.
		u : {

//mode is required and can be create or update.
//form is pretty self-explanatory.
//$domainEditor is the PARENT context of the original button clicked to open the host editor. ex: the anypanel. technically, this isn't required but will provide a better UX.
			domainAddUpdateHost : function(mode,$form,$domainEditor)	{
				if(mode == 'create' || mode == 'update' && $form instanceof jQuery)	{

					var sfo = $form.serializeJSON({'cb':true});
					$form.showLoading({"message":"Updating host..."});
					var cmdObj = {
						_cmd : 'adminDomainMacro',
						_tag : {
							jqObj : $form,
							message : 'Your changes have been saved',
							callback : 'showMessaging',
							persistent : true
							},
						'DOMAINNAME' : sfo.DOMAINNAME,
						'@updates' : new Array()
						}

					if(mode == 'create')	{
						cmdObj['@updates'].push("HOST-ADD?HOSTNAME="+encodeURIComponent(sfo.HOSTNAME));
						}

					var hostSet = "HOST-SET?"+$.param(_app.u.getWhitelistedObject(sfo,['HOSTNAME','HOSTTYPE']));

//The key and the CRT should only get updated if they've changed.
					if($("textarea[name='KEY']",$form).hasClass('edited'))	{
						cmdObj['@updates'].push("HOST-SSL-UPDATE-KEY?HOSTNAME="+encodeURIComponent(sfo.HOSTNAME)+"&KEY="+encodeURIComponent(sfo.KEY));
						}
					if($("textarea[name='CRT']",$form).hasClass('edited'))	{
						cmdObj['@updates'].push("HOST-SSL-UPDATE-CRT?HOSTNAME="+encodeURIComponent(sfo.HOSTNAME)+"&CRT="+encodeURIComponent(sfo.CRT));
						}

					if(sfo.HOSTTYPE == 'VSTORE' || sfo.HOSTTYPE == 'VSTORE-APP')	{
						$("[data-app-role='domainRewriteRulesTbody'] tr",$form).each(function(){
							var $tr = $(this);
							if($tr.hasClass('rowTaggedForRemove'))	{
								cmdObj['@updates'].push("VSTORE-KILL-REWRITE?PATH="+encodeURIComponent($tr.data('path')));
								}
							else if($tr.hasClass('isNewRow'))	{
								cmdObj['@updates'].push("VSTORE-ADD-REWRITE?PATH="+encodeURIComponent($tr.data('path'))+"&TARGETURL="+encodeURIComponent($tr.data('targeturl')));
								}
							else	{} //unchanged row. this is a non-destructive process, so existing rules don't need to be re-added.
							})
						}
					else if(sfo.HOSTTYPE == 'APPTIMIZER')	{
						hostSet += "&force_https="+encodeURIComponent(sfo.force_https);
						if(sfo.project_source == 'template')	{
							hostSet += "&PROJECT="+encodeURIComponent(sfo.HOSTNAME.toLowerCase()+"."+sfo.DOMAINNAME);
							_app.model.addDispatchToQ({
								"_cmd":"adminSiteTemplateInstall",
								"SUBDIR" : sfo.TEMPLATE,
								"PROJECTID" : "$SYSTEM",
								"HOSTDOMAIN":sfo.HOSTNAME.toLowerCase()+"."+sfo.DOMAINNAME
								},"immutable");
							}
						else if(sfo.project_source == 'project')	{
							hostSet += "&PROJECT="+encodeURIComponent(sfo.PROJECT);
							}
						else	{
							
							}
						}
					else if(sfo.HOSTTYPE == 'REDIR')	{
						hostSet += "&URI="+encodeURIComponent(sfo.URI)+"&REDIR="+encodeURIComponent(sfo.REDIR);
						}
					else if(sfo.HOSTTYPE == 'CUSTOM')	{
						//supported. no extra params needed.
						}
					else {
						hostSet = false;
						} //catch. some unsupported type.
					
					if(hostSet)	{
						cmdObj['@updates'].push(hostSet);
						}
					else	{
						$form.anymessage({'message':'The host type was not a recognized type. We are attempting to save the rest of your changes.'});
						}


					_app.model.addDispatchToQ(cmdObj,'immutable'); //this handles the update cmd.
//This will update the hosts tbody.
					if($domainEditor instanceof jQuery)	{
						var $tbody = $("tbody[data-app-role='domainsHostsTbody']",$domainEditor);
						if($tbody.length)	{
							$tbody.empty();
							_app.model.addDispatchToQ({
								'_cmd':'adminDomainDetail',
								'DOMAINNAME':sfo.DOMAINNAME,
								'_tag':	{
									'datapointer' : 'adminDomainDetail|'+sfo.DOMAINNAME,
									'skipAppEvents' : true,
									'translateOnly' : true,
									'jqObj' : $tbody,
									'callback' : 'anycontent'
									}
								},'immutable');
							}
						else	{
							_app.u.dump("In admin_sites.u.domainAddUpdateHost, $domainEditor was specified [length: "+$domainEditor.length+"], but tbody[data-app-role='domainsHostsTbody'] has no length, so the view will not be updated.","warn");
							}
						}
					
					_app.model.dispatchThis('immutable');
					
					}
				else if($form instanceof jQuery)	{
					$form.anymessage({"message":"In admin_sites.u.domainAddUpdateHost, mode ["+mode+"] was invalid. must be create or update.","gMessage":true});
					}
				else	{
					$('#globalMessaging').anymessage({"message":"In admin_sites.u.domainAddUpdateHost, $form was not passed or is not a valid jquery instance.","gMessage":true});
					}
				}, //domainAddUpdateHost

			fetchSiteTabData : function($target,Q)	{
				_app.model.addDispatchToQ({
					'_cmd':'adminDomainList',
					'hosts' : true,
					'_tag':	{
						'datapointer' : 'adminDomainList',
						'callback':'anycontent',
						'translateOnly' : true,
						'jqObj' : $("[data-app-role='domainsAndHostsContainer']:first",$target)
						}
					},Q);
				_app.model.addDispatchToQ({
					'_cmd':'adminProjectList',
					'_tag':	{
						'datapointer' : 'adminProjectList',
						'callback':'anycontent',
						'translateOnly' : true,
						'jqObj' : $("[data-app-role='projectsContainer']:first",$target)
						}
					},Q);
				}
			}, //u [utilities]


		e : {

			adminSEOInitExec : function($ele,P)	{
				var host = $ele.closest('tr').data('hostname'), domain = $ele.closest("[data-domain]").data('domain');
				if(host && domain)	{
					var $D = _app.ext.admin.i.dialogCreate({
						'title':'Get SEO Token',
						'showLoading':false //will get passed into anycontent and disable showLoading.
						});
					
					$D.dialog('open').showLoading({"message":"Fetching SEO token"});
					_app.model.addDispatchToQ({"_cmd":"adminSEOInit","hostdomain":host+"."+domain,"_tag":{"datapointer":"adminSEOInit","callback":function(rd){
						$D.hideLoading();
						if(_app.model.responseHasErrors(rd)){
							$D.anymessage({'message':rd});
							}
						else	{
							//sample action. success would go here.
							$D.append("Your token is: "+_app.data[rd.datapointer].token);
							}
						}}},"mutable");
					_app.model.dispatchThis("mutable");
					}
				else	{
					$("#globalMessaging").anymessage({"message":"In admin_sites.e.adminSEOInitExec, unable to determine either the host ["+host+"] and/or the domain ["+domain+"].","gMessage":true});
					}
				},

			adminDomainCreateShow : function($ele,p)	{
				var $D = _app.ext.admin.i.dialogCreate({
					'title':'Add New Domain',
					'templateID':'domainCreateTemplate',
					'showLoading':false //will get passed into anycontent and disable showLoading.
					});
				_app.u.handleButtons($D);
				$D.dialog('open');
				$D.anyform();
				}, //adminDomainCreateShow


//if(domain == _app.vars.domain)	{$ele.addClass('ui-state-highlight')}
			domainPutInFocus : function($ele,p)	{
				var domain = $ele.closest("[data-domainname]").data('domainname');
				if(domain)	{
					_app.ext.admin.a.changeDomain(domain,$ele.closest("[data-prt]").attr('data-prt'));
					navigateTo(document.location.hash);
					}
				else	{
					$("#globalMessaging").anymessage({"message":"In admin_sites.e.domainPutInFocus, unable to ascertain domain.","gMessage":true});
					}
				}, //domainPutInFocus

//				if($ele.closest("[data-is_favorite]").data('is_favorite') == 1)	{$ele.addClass('ui-state-highlight')}
			adminDomainToggleFavoriteExec : function($ele,p)	{
				$ele.toggleClass('ui-state-highlight');
				var domainname = $ele.closest("[data-domainname]").data('domainname');
				_app.model.addDispatchToQ({
					'_tag':{
						'callback' : 'showMessaging',
						'message' : domainname+' has been '+($ele.hasClass('ui-state-highlight') ? 'tagged as a favorite. It will now show at the top of some domain lists.' : 'removed from your favorites')
						},
					'_cmd':'adminDomainMacro',
					'DOMAINNAME':domainname,
					'@updates':["DOMAIN-SET-FAVORITE?IS="+($ele.hasClass('ui-state-highlight') ? 1 : 0)]
					},'passive');
				_app.model.dispatchThis('passive');
				}, //adminDomainToggleFavoriteExec

			adminDomainDiagnosticsShow : function($ele,p)	{
				if($ele.data('domainname'))	{
					_app.u.dump(" -> tabcontent.length: "+$ele.closest("[data-app-role='tabContainer']").find("tbody[data-app-role='domainDiagnosticsTbody']:first").length);
					$ele.closest("[data-app-role='tabContainer']").find("tbody[data-app-role='domainDiagnosticsTbody']:first").intervaledEmpty();
					_app.model.addDispatchToQ({
						'_cmd':'adminDomainDiagnostics',
						'DOMAINNAME':$ele.data('domainname'),
						'_tag':{
							'datapointer':'adminDomainDiagnostics|'+$ele.data('domainname'),
							'callback':'anycontent',
							'jqObj':$ele.closest("[data-app-role='tabContainer']").find("[data-anytab-content='domainDiagnostics']:first").showLoading({'message':'Fetching domain diagnostics'})
							}
						},'mutable');
					_app.model.dispatchThis('mutable');
					}
				else	{
					$ele.closest("[data-app-role='tabContainer']").anymessage({"message":"in admin_sites.e.adminDomainDiagnosticsShow, data-domainname not set on element.","gMessage":true});
					}
				}, //adminDomainDiagnosticsShow

			adminDomainDetailShow : function($ele,p)	{
				
				var $detail = $ele.closest('tr').next('tr').find("[data-app-role='domainDetailContainer']:first");
				var wasVisible = $detail.is(':visible'); //used to track state prior to all detail panels being closed.
				$("[data-app-role='domainDetailContainer']:visible",$ele.closest('table')).each(function(){$(this).slideUp('slow','',function(){
					$(this).intervaledEmpty().anycontent('destroy');
					});}); //close any open rows. interface gets VERY crowded if more than one editor is open.
				_app.u.dump(" -> wasVisible: "+wasVisible);
				if(wasVisible)	{}//was open and has already been closed
				else	{
					$detail.show();
					var domainname = $ele.closest("[data-domainname]").data('domainname');
					if(domainname)	{
						$detail.anycontent({'templateID':'domainUpdateTemplate','showLoadingMessage':'Fetching domain details'});
						$detail.attr({'data-domainname':domainname,'data-domain':domainname});
						$("[data-app-role='domainsHostsTbody']",$detail).attr({'data-domainname':domainname,'data-domain':domainname}).addClass('buttonset'); //here for templateEditor.
						_app.model.addDispatchToQ({'_cmd':'adminConfigDetail','prts':1,'_tag':{'datapointer':'adminConfigDetail|prts'}},'mutable');
						_app.model.addDispatchToQ({
							'_cmd':'adminDomainDetail',
							'DOMAINNAME':domainname,
							'_tag':	{
								'datapointer' : 'adminDomainDetail|'+domainname,
								'skipAppEvents' : true,
								'extendByDatapointers' : ['adminConfigDetail|prts'],
								'translateOnly' : true,
								'jqObj' : $detail,
								'callback' : 'anycontent',
								onComplete : function(rd)	{
									$('form',$detail).anyform({'trackEdits':true}); //enable form 'tracking' so save button counts number of changes
									$("select[name='PRT']",$detail).val(_app.data[rd.datapointer].PRT); //select the partition
									}
								}
							},'mutable');
						_app.model.dispatchThis('mutable');
						}
					else	{}
					}
				}, //adminDomainDetailShow

			domainView : function($ele,p)	{
				var domainname = $ele.closest("[data-domainname]").data('domainname');
				if(domainname)	{
					if($ele.data('mode') == 'host')	{
						var hostname = $ele.closest("[data-hostname]").data('hostname');
						if(hostname)	{
							linkOffSite("http://"+hostname+"."+domainname+"/",'',true);
							}
						else {
							$('#globalMessaging').anymessage({"message":"In admin.e.domainView, unable to determine host.","gMessage":true});
							}
						}
					else	{
						linkOffSite("http://www."+domainname+"/",'',true);
						}
					}
				else	{
					$('#globalMessaging').anymessage({"message":"In admin.e.domainView, unable to determine domain.","gMessage":true});
					}
				},

			adminDomainCreateUpdateHostShow : function($ele,p)	{
				var domain = $ele.closest('[data-domain]').data('domain');

				if(domain)	{
					var data = {'DOMAINNAME':domain}
					var title = $ele.data('mode') + '  host';
					if($ele.data('mode') == 'update')	{
// ### FUTURE -> this is gonna get more love soon.  When it does, for adding a template to a host, would be nice to remember which template was selected.
						$.extend(data,_app.data['adminDomainDetail|'+domain]['@HOSTS'][$ele.closest('tr').data('obj_index')]);
						title += ': '+(data.HOSTNAME.toString().toLowerCase())
						}
					
					title += ' for '+domain
					
					var $D = _app.ext.admin.i.dialogCreate({
						'title': title,
						'data' : data, //passes in DOMAINNAME and anything else that might be necessary for anycontent translation.
						'templateID':'domainAddUpdateHostTemplate',
						'appendTo' : $ele.closest("[data-app-role='domainDetailContainer']"),
						'showLoading':false //will get passed into anycontent and disable showLoading.
						});

//get the list of projects and populate the select list.  If the host has a project set, select it in the list.
					var _tag = {'datapointer' : 'adminProjectList','callback':function(rd){
						if(_app.model.responseHasErrors(rd)){
							$("[data-panel-id='domainNewHostTypeSITEPTR']",$D).anymessage({'message':rd});
							}
						else	{
							//success content goes here.
							$("[data-panel-id='domainNewHostTypeSITEPTR']",$D).anycontent({'datapointer':rd.datapointer});
							if($ele.data('mode') == 'update')	{
								$("input[name='PROJECT']",$D).val(_app.data['adminDomainDetail|'+domain]['@HOSTS'][$ele.closest('tr').data('obj_index')].PROJECT)
								}
							_app.u.handleButtons($D);
							_app.u.handleCommonPlugins($D);
							}
						}};

					if(_app.model.fetchData(_tag.datapointer) == false)	{
						_app.model.addDispatchToQ({'_cmd':'adminProjectList','_tag':	_tag},'mutable'); //necessary for projects list in app based hosttypes.
						_app.model.dispatchThis();
						}
					else	{
						_app.u.handleCallback(_tag);
						}

					if(_app.model.fetchData('adminSiteTemplateList') == false)	{
						_app.model.addDispatchToQ({'_cmd':'adminSiteTemplateList','_tag':{
							'datapointer' : 'adminSiteTemplateList',
							'callback' : 'anycontent',
							'jqObj' : $("[data-app-role='hostTemplateListContainer']",$D)
							}},'mutable'); //necessary for projects list in app based hosttypes.
						_app.model.dispatchThis();
						}
					else	{
						$("[data-app-role='hostTemplateListContainer']",$D).anycontent({'datapointer' : 'adminSiteTemplateList'});
						}
						
					_app.model.addDispatchToQ({'_cmd':'adminProjectList','_tag':	_tag},'mutable'); //necessary for projects list in app based hosttypes.

//hostname isn't editable once set.					
					if($ele.data('mode') == 'update')	{
						$("input[name='HOSTNAME']",$D).attr('disabled','disabled');
						}
					
					$("form",$D).append(
						$("<button>Save<\/button>").button().addClass('floatRight').on('click',function(event){
							event.preventDefault();
							_app.ext.admin_sites.u.domainAddUpdateHost($ele.data('mode'),$('form',$D),$ele.closest("[data-app-role='domainDetailContainer']"));
							})
						)
					_app.u.addEventDelegation($D);
					$D.anyform({'trackEdits':true}).dialog('open');
					}
				else	{
					$ele.closest('.ui-widget-content').anymessage({'message':'In admin_sites.e.adminDomainCreateUpdateHostShow, unable to ascertain domain.','gMessage':true});
					}
				}, //adminDomainCreateUpdateHostShow

/////////////////// PROJECTS \\\\\\\\\\\\\\\\\\\\

			projectDetailShow : function($ele,p)	{
				var $detailRow = $ele.closest('tr').next('tr');
				$detailRow.toggle();
				if($detailRow.is(':visible'))	{
					$detailRow.showLoading({'message':'Fetching project details'});
					var	projectUUID = $ele.closest("[data-uuid]").attr('data-uuid');
					if(projectUUID)	{
	//files are not currently fetched. slows things down and not really necessary since we link to github. set files=true in dispatch to get files.
						_app.model.addDispatchToQ({
							"_cmd":"adminProjectDetail",
							"UUID":projectUUID,
							"_tag": {
								'callback':'anycontent',
								'translateOnly' : true,
								jqObj:$detailRow,
								'datapointer' : 'adminProjectDetail|'+projectUUID
								}
							},'mutable');
						_app.model.dispatchThis('mutable'); 
						}
					else	{
						$('#globalMessaging').anymessage({"message":"In admin_sites.e.projectDetailShow, unable to ascertain project UUID.","gMessage":true});
						}
					
					}
				return false;
				}, //projectUpdateShow
			
			projectCreateShow : function($ele,p)	{
				var $D = _app.ext.admin.i.dialogCreate({
					'title' : 'Create a New Project',
					'templateID' : 'projectCreateTemplate',
					showLoading : false
					});
				$D.dialog('open');
				$D.anyform();
				_app.u.handleButtons($D);
				return false;
				}, //projectCreateShow
			
			projectCreateExec  : function($ele,p)	{
				var
					$form = $ele.closest('form'),
					sfo = $form.serializeJSON();
				
				if(_app.u.validateForm($form))	{
					$form.showLoading({'message':'Adding your new project. This may take a few moments as the repository is imported.'});
					_app.model.destroy('adminProjectList');
					sfo.UUID = _app.u.guidGenerator();
					sfo._cmd = 'adminProjectCreate';
					sfo._tag = {"callback":function(rd){
						$form.hideLoading();
						if(_app.model.responseHasErrors(rd)){
							$form.anymessage({'message':rd});
							}
						else	{
							$('#globalMessaging').anymessage(_app.u.successMsgObject('Thank you, your project has been created.'));
							$ele.closest('.ui-dialog-content').dialog('close');
							navigateTo("#!ext/admin_sites/showDomainConfig");
							}
						}}
					_app.model.addDispatchToQ(sfo,"immutable");
					_app.model.dispatchThis('immutable');
					}
				else	{} //validateForm handles error display.

				}, //projectCreateExec

			projectRemove : function($ele,p)	{
				var $D = _app.ext.admin.i.dialogConfirmRemove({
					"message" : "Are you sure you wish to remove this app/project? There is no undo for this action.",
					"removeButtonText" : "Remove Project", //will default if blank
					"title" : "Remove Project", //will default if blank
					"removeFunction" : function(p,$D){
						$D.parent().showLoading({"message":"Deleting "});
						_app.model.addDispatchToQ({
							'_cmd':'adminProjectRemove',
							'UUID' : $ele.closest("[data-uuid]").attr('data-uuid'),
							'_tag':	{
								'callback':function(rd){
									$D.parent().hideLoading();
									if(_app.model.responseHasErrors(rd)){
										$D.anymessage({'message':rd});
										}
									else	{
										$D.dialog('close');
										$('#globalMessaging').anymessage(_app.u.successMsgObject('Your project has been removed'));
										$ele.closest('tr').hide().intervaledEmpty();
										}
									}
								}
							},'mutable');
						_app.model.dispatchThis('mutable');
						}
					});
				return false;
				}, //projectRemove
			
			cryptoToolMakeKeyShow : function($ele,P)	{
				P.preventDefault();
				var $D = _app.ext.admin.i.dialogCreate({
					title : "Generate an SSL key",
					templateID : "sslMakeKeyTemplate",
					appendTo : $ele.closest('fieldset'),
					showLoading : false,
					anycontent : true, //the dialogCreate params are passed into anycontent
					handleAppEvents : false //defaults to true
					});
				_app.u.handleButtons($D);
				$D.dialog('open');

				},
			
			cryptoToolMakeKeyExec : function($ele,P)	{
				P.preventDefault();
				var $D = $ele.closest('.ui-dialog-content'); //used for context.
				_app.model.addDispatchToQ({"_cmd":"cryptoTool","verb":"make-key","length" : $("select[name='length']",$D).val(),"_tag":{"datapointer":"cryptoTool|make-key","callback":function(rd){
					if(_app.model.responseHasErrors(rd)){
						$D.anymessage({'message':rd});
						}
					else	{
						$ele.closest('fieldset').find("textarea[name='KEY']").val(_app.data[rd.datapointer].key).trigger('change');
						$D.dialog('close');
						//_app.model.destroy("cryptTool|make-key"); // ### TODO -> uncomment this after testing.
						}
					}}},"immutable");
				_app.model.dispatchThis("immutable");
				}

			} //e [app Events]
		} //r object.
	return r;
	}