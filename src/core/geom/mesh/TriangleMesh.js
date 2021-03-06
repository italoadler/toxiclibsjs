//is there any reason for this to implement Mesh3D?
toxi.TriangleMesh = function(name,numV,numF){
	if(name === undefined)name = "untitled";
	if(numV === undefined)numV = toxi.TriangleMesh.DEFAULT_NUM_VERTICES;
	if(numF === undefined)numF = toxi.TriangleMesh.DEFAULT_NUM_FACES;
	this.setName(name);
	this.matrix = new toxi.Matrix4x4();
	this.vertices = [];
	this.faces = [];
	this.numVertices = 0;
	this.numFaces = 0;
	this.uniqueVertexID = -1;
	return this;
}


//statics
toxi.TriangleMesh.DEFAULT_NUM_VERTICES = 1000;
toxi.TriangleMesh.DEFAULT_NUM_FACES = 3000;
toxi.TriangleMesh.DEFAULT_STRIDE = 4;

toxi.TriangleMesh.prototype = {

	addFace: function(a,b,c,n,uvA,uvB,uvC){
		if(uvC === undefined){ //then it wasnt the 7 param method
			if(uvB === undefined){ //then it wasnt the 6 param method
				//its either the 3 or 4 param method
				if(uvA === undefined){
					//3 param method
					n = undefined;
					uvA = undefined;
					uvB = undefined;
					uvC = undefined;
				} else {
					//4 param method
					uvA = undefined;
					uvB = undefined;
					uvC = undefined;
				}
			} else {
				//6 param method
				//pass down the chain
				uvC = uvB;
				uvB = uvA;
				uvA = n;
			}
		}
		//7 param method
		var va = this.checkVertex(a);
		var vb = this.checkVertex(b);
		var vc = this.checkVertex(c);
		
		if(va.id == vb.id || va.id == vc.id || vb.id == vc.id){
			console.log("ignoring invalid face: "+a + ", " +b+ ", "+c);
		} else {
			if(n != undefined){
				var nc = va.sub(vc).crossSelf(va.sub(vb));
				if(n.dot(nc)<0){
					var t = va;
					va = vb;
					vb = t;
				}
			}
			var f = new toxi.Face(va,vb,vc,uvA,uvB,uvC);
			//console.log(f.toString());
			this.faces.push(f);
			this.numFaces++;
		}
		return this;
	},
	
	addMesh: function(m){
	    var l = m.getFaces().length;
		for(var i=0;i<l;i++){
			var f = m.getFaces()[i];
			this.addFace(f.a,f.b,f.c);
		}
		return this;
	},
	
	center: function(origin){
		this.computeCentroid();
		var delta = origin != undefined ? origin.sub(this.centroid) : this.centroid.getInverted();
		var l = this.vertices.length;
		for(var i=0;i<l;i++){
			var v = this.vertices[i];
			v.addSelf(delta);
		}
		this.getBoundingBox();
		return this.bounds;
	},
	
	checkVertex: function(v){
		var vertex = this.vertices[v];
		if(vertex === undefined){
			vertex = this.createVertex(v,this.uniqueVertexID++);
			this.vertices.push(vertex);
			this.numVertices++;
		}
		return vertex;
	},
	
	clear: function(){
		this.vertices = [];
		this.faces = [];
		this.bounds = undefined;
		this.numVertices = 0;
		this.numFaces = 0;
		return this;
	},
	
	computeCentroid: function(){
		this.centroid.clear();
		var l = this.vertices.length;
		for(var i=0;i<l;i++){
			this.centroid.addSelf(this.vertices[i]);
		}
		return this.centroid.scaleSelf(1.0/this.numVertices).copy();
	},
	
	computeFaceNormals: function(){
		var l = this.faces.length;
		for(var i=0;i<l;i++){
			this.faces[i].computeNormal();
		}
	},
	
	computeVertexNormals: function(){
		var l = this.vertices.length;
		for(var i=0;i<l;i++){
			this.vertices[i].clearNormal();
		}
		l = this.faces.length;
		for(var i=0;i<l;i++){
			var f = this.faces[i];
			f.a.addFaceNormal(f);
			f.b.addFaceNormal(f);
			f.c.addFaceNormal(f);
		}
		var l = this.vertices.length;
		for(var i=0;i<l;i++){
			this.vertices[i].computeNormal();
		}
		return this;
	},
	
	copy: function(){
		var m = new toxi.TriangleMesh(this.name+"-copy",this.numVertices,this.numFaces);
		var l = this.faces.length;
		for(var i=0;i<l;i++){
			var f = this.faces[i];
			m.addFace(f.a,f.b,f.c,f.normal,f.uvA,f.uvB,f.uvC);
		}
		return m;
	},
	
	createVertex: function(v,id){
		return new toxi.Vertex(v,id);
	},
	
	faceOutwards: function(){
		this.computeCentroid();
		var l = this.faces.length;
		for(var i=0;i<l;i++){
			var f = this.faces[i];
			var n = f.getCentroid().sub(this.centroid);
			var dot = n.dot(f.normal);
			if(dot <0) {
				f.flipVertexOrder();
			}
		}
		return this;
	},
	
	flipVertexOrder: function(){
		var l = this.faces.length;
		for(var i=0;i<l;i++){
			var f = this.faces[i];
			var t = f.a;
			f.a = f.b;
			f.b = t;
			f.normal.invert();
		}
		return this;
	},
	
	flipYAxis: function(){
		this.transform(new Matrix4x4().scaleSelf(1,-1,1));
		this.flipVertexOrder();
		return this;
	},
	
	getBoundingBox:function(){
		var minBounds = toxi.Vec3D.MAX_VALUE.copy();
		var maxBounds = toxi.Vec3D.MIN_VALUE.copy();
		var l = this.vertices.length;
		for(var i=0;i<l;i++){
			this.minBounds.minSelf(v);
			this.maxBounds.maxSelf(v);
		}
		this.bounds = toxi.AABB.fromMinMax(minBounds,maxBounds);
		return this.bounds;
	},
	
	getBoundingSphere:function(){
		var radius = 0;
		this.computeCentroid();
		var l = this.vertices.length;
		for(var i=0;i<l;i++){
			var v = this.vertices[i];
			radius = toxi.MathUtils.max(radius,v.distanceToSquared(this.centroid));
		}
		return new toxi.Sphere(this.centroid,Math.sqrt(radius));
	},
	
	getClosestVertexToPoint: function(p){
		var closest = undefined;
		var minDist = Number.MAX_VALUE;
		var l = this.vertices.length;
		for(var i=0;i<l;i++){
			var v = this.vertices[i];
			var d = v.distanceToSquared(p);
			if(d<minDist){
				closest = v;
				minDist = d;
			}
		}
		return closest;
	},
	
	/**
     * Creates an array of unravelled normal coordinates. For each vertex the
     * normal vector of its parent face is used. This is a convienence
     * invocation of {@link #getFaceNormalsAsArray(float[], int, int)} with a
     * default stride = 4.
     * 
     * @return array of xyz normal coords
     */
    getFaceNormalsAsArray: function() {
        return this.getFaceNormalsAsArray(undefined, 0, toxi.TriangleMesh.DEFAULT_STRIDE);
    },

	/**
     * Creates an array of unravelled normal coordinates. For each vertex the
     * normal vector of its parent face is used. This method can be used to
     * translate the internal mesh data structure into a format suitable for
     * OpenGL Vertex Buffer Objects (by choosing stride=4). For more detail,
     * please see {@link #getMeshAsVertexArray(float[], int, int)}
     * 
     * @see #getMeshAsVertexArray(float[], int, int)
     * 
     * @param normals
     *            existing float array or null to automatically create one
     * @param offset
     *            start index in array to place normals
     * @param stride
     *            stride/alignment setting for individual coordinates (min value
     *            = 3)
     * @return array of xyz normal coords
     */
    getFaceNormalsAsArray: function(normals, offset, stride) {
        stride = toxi.MathUtils.max(stride, 3);
        if (normals == undefined) {
            normals = [];
        }
        var i = offset;
        var l = this.faces.length;
        for (var i=0;i<l;i++) {
        	var f = this.faces[i];
            normals[i] = f.normal.x;
            normals[i + 1] = f.normal.y;
            normals[i + 2] = f.normal.z;
            i += stride;
            normals[i] = f.normal.x;
            normals[i + 1] = f.normal.y;
            normals[i + 2] = f.normal.z;
            i += stride;
            normals[i] = f.normal.x;
            normals[i + 1] = f.normal.y;
            normals[i + 2] = f.normal.z;
            i += stride;
        }
        return normals;
    },

    getFaces: function() {
        return this.faces;
    },
	
	/**
     * Builds an array of vertex indices of all faces. Each vertex ID
     * corresponds to its position in the {@link #vertices} HashMap. The
     * resulting array will be 3 times the face count.
     * 
     * @return array of vertex indices
     */
    getFacesAsArray: function() {
        var faceList = [];
        var i = 0;
        var l = this.faces.length;
        for (var i=0;i<l;i++) {
        	var f = this.faces[i];
            faceList[i++] = f.a.id;
            faceList[i++] = f.b.id;
            faceList[i++] = f.c.id;
        }
        return faceList;
    },

    getIntersectionData: function() {
        return this.intersector.getIntersectionData();
    },

	
	/**
     * Creates an array of unravelled vertex coordinates for all faces. This
     * method can be used to translate the internal mesh data structure into a
     * format suitable for OpenGL Vertex Buffer Objects (by choosing stride=4).
     * The order of the array will be as follows:
     * 
     * <ul>
     * <li>Face 1:
     * <ul>
     * <li>Vertex #1
     * <ul>
     * <li>x</li>
     * <li>y</li>
     * <li>z</li>
     * <li>[optional empty indices to match stride setting]</li>
     * </ul>
     * </li>
     * <li>Vertex #2
     * <ul>
     * <li>x</li>
     * <li>y</li>
     * <li>z</li>
     * <li>[optional empty indices to match stride setting]</li>
     * </ul>
     * </li>
     * <li>Vertex #3
     * <ul>
     * <li>x</li>
     * <li>y</li>
     * <li>z</li>
     * <li>[optional empty indices to match stride setting]</li>
     * </ul>
     * </li>
     * </ul>
     * <li>Face 2:
     * <ul>
     * <li>Vertex #1</li>
     * <li>...etc.</li>
     * </ul>
     * </ul>
     * 
     * @param verts
     *            an existing target array or null to automatically create one
     * @param offset
     *            start index in arrtay to place vertices
     * @param stride
     *            stride/alignment setting for individual coordinates
     * @return array of xyz vertex coords
     */
    getMeshAsVertexArray: function(verts, offset, stride) {
    	if(verts ===undefined){
   		  	verts = undefined;
    	}
    	if(offset === undefined){ 
    		offset = 0;
    	}
    	if(stride === undefined){
    		stride = toxi.TriangleMesh.DEFAULT_STRIDE
    	}
        stride = toxi.MathUtils.max(stride, 3);
        if (verts == undefined) {
            verts = [];
        }
        var i = 0;//offset;
        var l = this.faces.length;
        for (var j=0;j<l;++j) {
        	var f = this.faces[j];
            verts[i] = f.a.x;
            verts[i + 1] = f.a.y;
            verts[i + 2] = f.a.z;
            i += stride;
            verts[i] = f.b.x;
            verts[i + 1] = f.b.y;
            verts[i + 2] = f.b.z;
            i += stride;
            verts[i] = f.c.x;
            verts[i + 1] = f.c.y;
            verts[i + 2] = f.c.z;
            i += stride;
        }
        return verts;
    },
    
    getNumFaces: function() {
        return this.numFaces;
    },

    getNumVertices: function() {
        return this.numVertices;
    },

    getRotatedAroundAxis: function(axis,theta) {
        return this.copy().rotateAroundAxis(axis, theta);
    },

    getRotatedX: function(theta) {
        return this.copy().rotateX(theta);
    },

    getRotatedY: function(theta) {
        return this.copy().rotateY(theta);
    },

    getRotatedZ: function(theta) {
        return this.copy().rotateZ(theta);
    },

	getScaled: function(scale) {
        return this.copy().scale(scale);
    },

    getScaled: function(scale) {
        return this.copy().scale(scale);
    },

    getTranslated: function(trans) {
        return this.copy().translate(trans);
    },

	getUniqueVerticesAsArray: function() {
        var verts = [];
        var i = 0;
        var l = this.vertices.length;
        for (var i=0;i<l;i++) {
        	var v = this.vertices[i];
            verts[i++] = v.x;
            verts[i++] = v.y;
            verts[i++] = v.z;
        }
        return verts;
    },

    getVertexAtPoint: function(v) {
    	var verts = this
        return this.vertices.get(v);
    },
    //my own method to help
    getVertexIndex: function(vec) {
    	var index = -1;
    	var l = this.vertices.length;
    	for(var i=0;i<l;i++)
    	{
    		var vert = this.vertices[i];
    		if(vert.equals(vec))
    		{
    			matchedVertex =i;
    		}
    	}
    	return matchedVertex;
    
    },

    getVertexForID: function(id) {
        var vertex = undefined;
        var l = this.vertices.length;
        for (var i=0;i<l;i++) {
        	var v = this.vertices[i];
            if (v.id == id) {
                vertex = v;
                break;
            }
        }
        return vertex;
    },
    
    /**
     * Creates an array of unravelled vertex normal coordinates for all faces.
     * This method can be used to translate the internal mesh data structure
     * into a format suitable for OpenGL Vertex Buffer Objects (by choosing
     * stride=4). For more detail, please see
     * {@link #getMeshAsVertexArray(float[], int, int)}
     * 
     * @see #getMeshAsVertexArray(float[], int, int)
     * 
     * @param normals
     *            existing float array or null to automatically create one
     * @param offset
     *            start index in array to place normals
     * @param stride
     *            stride/alignment setting for individual coordinates (min value
     *            = 3)
     * @return array of xyz normal coords
     */
    getVertexNormalsAsArray: function(normals, offset,stride) {
   		if(offset === undefined)offset = 0;
   		if(stride === undefined)stride = toxi.TriangleMesh.DEFAULT_STRIDE;
        stride = toxi.MathUtils.max(stride, 3);
        if (normals == undefined) {
            normals = [];
        }
        var i = offset;
        var l = this.faces.length;
        for (var j=0;j<l;j++) {
        	var f = this.faces[j];
            normals[i] = f.a.normal.x;
            normals[i + 1] = f.a.normal.y;
            normals[i + 2] = f.a.normal.z;
            i += stride;
            normals[i] = f.b.normal.x;
            normals[i + 1] = f.b.normal.y;
            normals[i + 2] = f.b.normal.z;
            i += stride;
            normals[i] = f.c.normal.x;
            normals[i + 1] = f.c.normal.y;
            normals[i + 2] = f.c.normal.z;
            i += stride;
        }
        return normals;
    },

	getVertices: function() {
        return this.vertices;
    },

    handleSaveAsSTL: function(stl,useFlippedY) {
        /*f (useFlippedY) {
            stl.setScale(new Vec3D(1, -1, 1));
            for (Face f : faces) {
                stl.face(f.a, f.b, f.c, f.normal, STLWriter.DEFAULT_RGB);
            }
        } else {
            for (Face f : faces) {
                stl.face(f.b, f.a, f.c, f.normal, STLWriter.DEFAULT_RGB);
            }
        }
        stl.endSave();
         console.log(numFaces + " faces written");
        */
        console.log("toxi.TriangleMesh.handleSaveAsSTL() currently not implemented");
       
    },
	
	
	intersectsRay: function(ray) {
        var tri = this.intersector.getTriangle();
        var l = this.faces.length;
        for (var i =0;i<l;i++) {
            tri.a = f.a;
            tri.b = f.b;
            tri.c = f.c;
            if (this.intersector.intersectsRay(ray)) {
                return true;
            }
        }
        return false;
    },
    
    perforateFace: function(f, size) {
        var centroid = f.getCentroid();
        var d = 1 - size;
        var a2 = f.a.interpolateTo(centroid, d);
        var b2 = f.b.interpolateTo(centroid, d);
        var c2 = f.c.interpolateTo(centroid, d);
        this.removeFace(f);
        this.addFace(f.a, b2, a2);
        this.addFace(f.a, f.b, b2);
        this.addFace(f.b, c2, b2);
        this.addFace(f.b, f.c, c2);
        this.addFace(f.c, a2, c2);
        this.addFace(f.c, f.a, a2);
        return new toxi.Triangle3D(a2, b2, c2);
    },
    
     /**
     * Rotates the mesh in such a way so that its "forward" axis is aligned with
     * the given direction. This version uses the positive Z-axis as default
     * forward direction.
     * 
     * @param dir
     *            new target direction to point in
     * @return itself
     */
    pointTowards: function(dir) {
        return this.transform( toxi.Quaternion.getAlignmentQuat(dir, toxi.Vec3D.Z_AXIS).toMatrix4x4(), true);
    },
    
    removeFace: function(f) {
    	var index = -1;
    	var l = this.faces.length;
    	for(var i=0;i<l;i++){
    		if(this.faces[i] == f){
    			index = i;
    			break;
    		}
    	}
        if(index > -1){
        	this.faces.splice(index,1);
        }
    },
    
    
    rotateAroundAxis: function(axis, theta) {
        return this.transform(this.matrix.identity().rotateAroundAxis(axis, theta));
    },

    rotateX: function(theta) {
        return this.transform(this.matrix.identity().rotateX(theta));
    },
	
	rotateY: function(theta) {
        return this.transform(this.matrix.identity().rotateY(theta));
    },

    rotateZ: function(theta) {
        return this.transform(this.matrix.identity().rotateZ(theta));
    },

    saveAsOBJ: function(obj) {
        console.log("toxi.TriangleMesh.saveAsOBJ() currently not implemented");
    },
    
    saveAsSTL: function(a,b,c){
    	console.log("toxi.TriangleMesh.saveAsSTL() currently not implemented");
    },
    
    scale: function(scale) {
        return this.transform(this.matrix.identity().scaleSelf(scale));
    },

 	setName: function(name) {
        this.name = name;
        return this;
    },

    toString: function() {
        return "toxi.TriangleMesh: " + this.name + " vertices: " + this.getNumVertices()
                + " faces: " + this.getNumFaces();
    },

    toWEMesh: function() {
      /*  return new WETriangleMesh(name, vertices.size(), faces.size())
                .addMesh(this);
       */
       console.log("toxi.TriangleMesh.toWEMesh() currently not implemented");
    },

   /**
     * Applies the given matrix transform to all mesh vertices. If the
     * updateNormals flag is true, all face normals are updated automatically,
     * however vertex normals need a manual update.
     * 
     * @param mat
     * @param updateNormals
     * @return itself
     */
    transform: function(mat,updateNormals) {
    	if(updateNormals === undefined)updateNormals = true;
    	var l = this.vertices.length;
    	for(var i=0;i<l;i++)
    	{
    		var v = this.vertices[i];
    		v.set(mat.applyTo(v));
    	}
    	if(updateNormals){
    		this.computeFaceNormals();
    	}
        return this;
    },
	
	translate: function(trans) {
        return this.transform(this.matrix.identity().translateSelf(trans));
    },

    updateVertex: function(orig,newPos) {
        var vi = this.getVertexIndex(orig);
        if (vi > -1) {
            this.vertices.splice(v,1);
            this.vertices[vi].set(newPos);
            this.vertices.push(v);
        }
        return this;
    }
};