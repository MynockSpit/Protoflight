/*

Some Notes:

Render VS Logic

Render and Logic do not call each other. Render takes latest stored values and displays them. Calculate stores the values. This means that 

*/

// Fake MongoDB object
var MongoDB = {
  systems: {}, // All systems
  ships: {}, // All ships
  weapons: {}, // All weapons
  planets: {}, // All planets
  star_fields: {}, // All star_fields (backgrounds)

};

var destroyTheBugs = (function() {

  window.addEventListener("load", function load_destroyTheBugs() {
    window.removeEventListener("load", load_destroyTheBugs, false);

    initialize();
  }, false);


  var systemData = {
    entity_count: 0,
  },
      weaponData = {
        yellow_lazer: [
          {
            type: "weapon",
            weaponType: "projectile", // [turreted-]projectile (bullet, missile, bomb) | beam

            damage: 100, // Damage
            explode: false, // true, false (does damage at end of range/hitting target)
            explodeRadius: 0, // ignored if explode is false 

            innaccuracy: 3, // Degrees of innacuracy

            turreted: false, // Starts aimed towards target instead matching parent
            turretDelay: 0, // seconds of delay before turreted weapon follows target

            guided: false, // Follows target
            guidedDelay: 0, // ticks of delay before guided weapon follows target

            range: 500, // max range in pixels (explodes / decays)

            turnRate: 127, // Increase in rotational speed per second

            reloadDelay: .5, // delay between reloading (s if leading . or 0. or ms if none)
            shotsPerBurst: 8, // If 0, use 1
            shotDelay: .1, // delay between shots (s if leading . or 0. or ms if none)

            accelleration: 0, // Increases movement speed by this many pixels per second (if this is set, assume the weapon is thrusted)
            initialSpeed: 1000,
            speedLimit: 0, // Max speed (only used if accelleration is not 0)

            inertialess: false,

            sprite: "yellow_lazer",
            svg: "", // Once loaded, compile this.

          },
          {
            element: "rect",
            attributes: [
              ["width","7"],
              ["height","2"],
              ["style","fill: yellow;"],
            ],
            content: "",
          }
        ]

      },
      entityData = [
        {
          type: "player", // player | npc | weapon | planet?

          turnRate: 200, // Increase in rotational speed per second

          accelleration: 600, // Increases movement speed by this many pixels per second
          speedLimit: 1000, // Max rotational speed

          inertialess: false,

          degrees: 0, // current rotation
          rotationalSpeed: 0,
          velocity: [0, 0], // Vector of velocity velocity[0] = x, velocity[1] = y (Also known as directional speed)
          position: [50, 50],

          ship: "Name of Ship",

          weapons: [
            { 
              weapon: "yellow_lazer",
              firingKeys: " 32 ",
              lastFired: 0,
              burstCount: 0,
            },
            { 
              weapon: "yellow_lazer",
              firingKeys: " 32 ",
              lastFired: 0,
              burstCount: 0,
            }
          ],
        },
        {
          type: "npc", // player | npc | weapon | planet?
          behavior: { type: "cc" }, // cc, lr

          turnRate: 127, // Increase in rotational speed per second

          degrees: 0,

          accelleration: 20, // Increases movement speed by this many pixels per second
          speedLimit: 1100, // Max rotational speed

          velocity: [0, 0], // Vector of velocity velocity[0] = x, velocity[1] = y
          position: [120, -100],

          inertialess: false,   
        },
      ]; // An array of system entities

  /*

  So, the idea here is that eventually we'll have a MongoDB full of all possible Systems, Planets, Ships, Weapons and everything else that we'll need, but we'll also have a local set of all data that we're using to reference.


  */

  // Things that can be changed by the player
  var settings = {
    logic_rate: 30,
    render_rate: 60,
    key_map: [],
  };

  // System variables
  var variables = {
    keys_pressed: {},
    center: [0,0],
    offset: [0,0],
    entity_count: 0, // Needed to make sure things have their own unique IDs.
  }

  var starData = {
    field_data: [
      // Density is number of stars in every 100x100 section
      // Size is the average size of stars
      // Distance is speed relative to speed of spaceship (smaller is slower) 
      {density: 2.5, size: 0.2, distance: 0.5},
      {density: 2, size: 0.3, distance: 0.52},
      {density: 1, size: 0.4, distance: 0.54},
      {density: 0.5, size: 0.6, distance: 0.56},
      {density: 0.25, size: 1, distance: 0.58}
    ],

    region_data: {
      count: 5, // Number of regions in a row (total regions per feild is row * row
    }
  }

  // This function/object combination starts when any action is triggered, checks for keys pressed, and runs the respective code sections

  var initialize = (function() {
    buildVariables();

    placeStars();
    placeEntities();
    centerScreen();

    function buildVariables() {
      // Build region data

      starData.region_data = {
        count: starData.region_data.count,
        width: (screen.width / (starData.region_data.count - 1)),
        height: (screen.width / (starData.region_data.count - 1) * 1),
      };

      starData.field_data = starData.field_data.map(function(object) {

        // Object comes in with density, size and distance already
        // Add position (the grid coord by which the stars are offset),
        // moveRow and moveCol (the row to flop when flopping rows/cols),
        // and rowCoords and colCords (the offset in px when flopping rows/cols)
        object.offset = [0,0]; //  
        object.position = [0,0]; //  
        object.moveRow = null;
        object.moveCol = null;

        object.rowCoords = []; // An array of arraws, on
        object.colCoords = [];

        for (var i = starData.region_data.count; i--;) {
          object.rowCoords.push(0);
          object.colCoords.push(0);
        }

        return object;
      });

      variables.center = [
        (window.innerWidth/2),
        (window.innerHeight/2)
      ];

    }

    function placeStars() {

      var field_data = starData.field_data,
          region_data = starData.region_data,
          stars_per_100 = (region_data.width * region_data.height) / (100 * 100);

      var count = 0; // testing data

      for (var i = field_data.length; i--;) {

        // Create feild
        var field = document.createElementNS("http://www.w3.org/2000/svg","g");

        // Set ID by distance (no two distances should be the same)
        field.setAttribute("id", field_data[i].distance);

        // Add field to stars element
        document.getElementById("stars").appendChild(field);

        for (var f = 0; f < (region_data.count * region_data.count); f++) {

          var col = (Math.floor(f / region_data.count)), // x
              row = (f % region_data.count); // y

          var offsetX = col * region_data.width,
              offsetY = row * region_data.height;

          // Store row and column data in field_data for later use
          field_data[i].colCoords[col] = col * region_data.width; 
          field_data[i].rowCoords[row] = row * region_data.height; 


          // Create region
          var region = document.createElementNS("http://www.w3.org/2000/svg","g");

          // Set identifiers
          region.setAttribute("data-sr-col",col);
          region.setAttribute("data-sr-row",row);

          // Set transform
          region.setAttribute("transform", "translate(" + offsetX + "," + offsetY + ")");

          field.appendChild(region);

          for (var s = (stars_per_100 * field_data[i].density), stars = ""; s > 0; s--) {

            count++; // Number of stars!


            // Create star
            var star = document.createElementNS("http://www.w3.org/2000/svg","ellipse");

            // Place star
            star.setAttribute("cx", (Math.floor(Math.random() * (region_data.width + 1))));
            star.setAttribute("cy", (Math.floor(Math.random() * (region_data.height + 1))));

            // Size Star
            star.setAttribute("rx", (field_data[i].size + (Math.floor(Math.random() * 4) * .25)));
            star.setAttribute("ry", (field_data[i].size + (Math.floor(Math.random() * 4) * .25)));

            // Color star
            star.setAttribute("style", "fill: rgb(" + 255 + ", " + (Math.floor(Math.random() * 56) + 200) + ", " + (Math.floor(Math.random() * 156) + 100) + ")");

            region.appendChild(star);
          }
        }

      }

      console.log(starData);

      console.log(count + " total stars.");
    }

    function placeEntities() {
      // fake function till I actually place things

      entityData[0].element = document.getElementById("player");
      entityData[1].element = document.getElementById("123456789");
    }

    function centerScreen(event) {

      var region_data = starData.region_data;

      var offsetX = ((region_data.width * region_data.count) / 2),
          offsetY = ((region_data.height * region_data.count) / 2);

      document.getElementById("stars").style.transform = "translate(" + (variables.center[0] - offsetX) + "px," + (variables.center[1] - offsetY) + "px)";
    }

    document.addEventListener("keydown", controls, false);
    document.addEventListener("keyup", controls, false);

    window.addEventListener("resize", centerScreen, false);

    render.start();
    logic.start();
  });  

  var logic = (function() {

    var rate, // number of updates per second (gets set by update)
        update_start = 0,
        update_finish = 0,
        keys = variables.keys_pressed;

    var entities = entityData; // Reference entityData

    var hash_grid = [],
        hash_keys = {};

    function update() {
      update_start = (new Date()); // checking framerate
      rate = (update_start - update_finish) / 1000;

      //document.getElementById("speedometer").innerHTML = Math.floor(1000 / (rate * 1000));

      grid.reset();

      for (var i = entities.length; i--;) { // Checks if i exists, then subtracts
        var entity = entities[i];

        if (entity.type == "npc") {
          // do npc-y stuff

          // Ship behaviors
          // cc - Close-Combat - Zoom up real close and stay with you
          // lr - Long-Range - Try to stay on the edge of your shooting range or at the edge of theirs

          // Ships need awareness of your shooting range and their shooting range
          // weapon_cooloff(entity);

          if (entity.behavior.type == "cc") {
            // do close combat stuff    
            behavior_cc(entity);
          }
        }
        else if (entity.type == "weapon") {
          if (entity.weaponType == "projectile") {

            // Check for hit

            // This triggers if a projectile exists
            // if (entity.guided) {}
            // if (Math.abs(entity.mSpeed) != entity.speedLimit) thrust(entity);

            drift(entity);
            projectile_distance(entity);
            // Check for hit again
          }
        }
        else if (entity.type == "player") {
          // do player-y stuff 

          // weapon_cooloff(entity);

          // Determine if turning.
          if (keys[40]) { // Back arrow
            if (!entity.inertialess) {
              turn_around(entity);
            }
            else {
              slow_down(entity);
            }
          }
          else if (keys[37] && !keys[39]) { // Left Arrow and not Right Arrow
            bank_left(entity);
          }
          else if (keys[39] && !keys[37]) { // Right Arrow and not Left Arrow
            bank_right(entity);
          }
          if (keys[38]) {
            thrust(entity);
          }

          drift(entity); // Kinda a misnomer -- simply moves the ship based on current info

          move_stars(entity);

          if (keys[32]) {
            fire_weapons(entity);
          }
        }

        // Temporary fix for the entity death thing
        if (entities[i]) {
          grid.add(entity);
        }
      }

      grid.detect();

      update_finish = (new Date());
      setTimeout(update, 0); // allows it to go as fast as it wants. Increasing the rate would force lower frames.
    }

    var grid = (function() {
      // This is one of the functions that relies heavily on SVG. 
      // If I moved to something else, this would have to be rebuilt.
      var pixels = 250;

      var data = [], // Stores all entities in array 
          keys = {}; // Maps arrays to the grid numbers.

      var count = 0;

      function reset() {
        data = [];
        keys = {};

        visualizer();
      }
      function add(entity) {

        var element = entity.element.getBBox();
        var top, bottom, left, right;

        // getBBox doesn't work great. It gets the bounding box of the entity without rotation.
        // That means there is a chance that a collision won't be detected.

        top = (entity.position[1] + element.y);
        left = (entity.position[0] + element.x);

        bottom = Math.floor((top + element.height) / pixels);
        top = Math.floor(top / pixels);
        right = Math.floor((left + element.width) / pixels);
        left = Math.floor(left / pixels);

        // top / bottom tells me the ROW the player is in
        // left / right tells me the COLUMN the player is in

        // Adds the entity to all grids that are between top and bottom grids
        for (var row = top; row <= bottom; row++) {

          // Adds the entity to all grids that are between the left and the right grids
          for (var col = left; col <= right; col++) {
            var cell = row + " " + col;

            if (typeof(keys[cell]) == "number") {
              // If this cell has been set before...

              data[keys[cell]].push(entity);
            }
            else {
              keys[cell] = data.length;
              data.push([entity]);   
            }

            visualize(col,row);
          }
        }
      }
      function detect() {
        for (var i = data.length; i--;) {
          if (data[i].length > 1) {
            // If there are more than two entities in a cell
            // console.log("Uh oh, collision?");   
          }
        }
      }

      /* Visualizer /*

        visualizer() is called by grid.reset() once.
        visualize() is called by grid.add() once per entitiy.

      */
      function visualizer() {

        var visualizer = document.getElementById("visualizer");

        if (!visualizer) {
          visualizer = document.createElementNS("http://www.w3.org/2000/svg","g");
          visualizer.id = "visualizer";
          document.getElementById("space").appendChild(visualizer);
        } else {
          visualizer.innerHTML = ""; 
        }
      }
      function visualize(x,y) {
        var visualizer = document.getElementById("visualizer");

        var box = document.createElementNS("http://www.w3.org/2000/svg","rect");
        box.setAttribute("width", pixels);
        box.setAttribute("height", pixels);
        box.style.fill = "none";
        box.style.stroke = "red";
        box.style.strokeWidth = "1px";

        var x = x * pixels,
            y = y * pixels;

        box.setAttribute("transform","translate(" + x + "," + y + ")");
        visualizer.appendChild(box);   
      }

      return {
        reset: reset,
        detect: detect,
        add: add,
      }
    }());

    // Re-usable thrust functions
    function bank_left(entity) {
      var degrees = entity.degrees,
          turnRate = entity.turnRate;

      degrees += turnRate * rate;
      entity.degrees = (degrees > 359) ? (degrees = degrees - 360) : degrees;
    }
    function bank_right(entity) {
      /* Gets current degrees, adds a linear amount of degrees to it based on the ships accelleration */
      var degrees = entity.degrees,
          turnRate = entity.turnRate;

      degrees -= turnRate * rate;
      entity.degrees = (degrees < 0) ? (degrees = 360 + degrees) : degrees;
    }
    function turn_around(entity) {
      var degrees = entity.degrees;

      console.log(degrees);
      
      /* Probably a way to simplify this, but I can't see it right now. */

      // driftDegrees uses the same formula as in the thrust function
      var driftDegrees = ((driftDegrees = Math.atan2(entity.velocity[1], entity.velocity[0]) * (180 / Math.PI)) < 0) ?
          Math.abs(driftDegrees) 
      : (driftDegrees > 0) ? 
          Math.abs(driftDegrees - 360) 
      : driftDegrees;

      /* Calculate the target degrees */
      var target = (driftDegrees >= 180) ? driftDegrees - 180 : driftDegrees + 180;

      /* Calculate the distance betwwen the target and the current */
      var difference = (difference = target - degrees) > 180 ?
          (difference - 360)
      : (difference < -180) ? 
          (difference + 360)
      : difference;

      var increment = (entity.turnAccelleration * rate);

      if (increment > Math.abs(difference)) {
        // This prevents turn jitter by checking if the turn will turn you past your intended goal, and if so sets your degrees to your target.
        entity.degrees = target;
      }
      else if (difference < 0 && !keys[37]) { // Turn right (if the left arrow key is not also pushed)

        bank_right(entity);
//        degrees -= increment;
//        entity.degrees = (degrees < 0) ? (degrees = 360 + degrees) : degrees;
      }
      else if (difference > 0 && !keys[39]) { // Turn left (if the right arrow key is not also pushed)

        bank_left(entity);
//        degrees += increment;
//        entity.degrees = (degrees > 359) ? (degrees = degrees - 360) : degrees;
      }
    }
    function slow_down(entity) {

    }
    function thrust(entity) {

      // Adding a second or third thrust-point wouldn't be all that hard.
      // All you'd have to do is add a bit that gets the degrees of the thrust point
      // and then use it as the degrees variable.

      var velocityX = entity.velocity[0],
          velocityY = entity.velocity[1];

      var degrees = entity.degrees,
          hypotenuse;

      var accell = entity.accelleration * rate,
          maxSpeed = entity.speedLimit;

      /* These two lines make the physics work. Everything else is for limiting speed. /*
            // This adds on a little bit of thrust in the direction given (degrees)
            // To add a side thruster, all you'd have to do is maniupulate that number
            // Note that multiplying by (Math.PI / 180) turns the degrees into radians (since that's what JS uses)
            // Also note that we're using accell as the hypotenuse */
      velocityX += (Math.cos(degrees * (Math.PI / 180)) * accell); 
      velocityY += (-Math.sin(degrees * (Math.PI / 180)) * accell);

      /* Hypotenuse (speed) based upon what happened when you added velocity. /*
            // Uses the pythagorean theorem to get the hypotenuse --  more reliable 
            // than using sin or cos individually. Note that the hypotenuse is used
            // to check and make sure the ship isn't going faster than it should be. */
      hypotenuse = Math.sqrt(Math.pow(velocityX, 2) + Math.pow(velocityY, 2));

      if (hypotenuse > maxSpeed || hypotenuse < -maxSpeed) {
        // Prevent ship from exceeding it's max speed
        hypotenuse = (maxSpeed > 0) ? maxSpeed : -maxSpeed;

        /* Recalculate the angle of the velocity to match the angle before the speed was capped /**/
        degrees = Math.atan2(velocityY, velocityX) * (180 / Math.PI); // Get arctan of velocityY/velocityX and convert it to degrees (between -360 and 360)
        degrees = (degrees < 0) ? // Checks if it's less than 0
          Math.abs(degrees) : (degrees > 0) ? // if so, flop value to positive (from -20° to 20°), and if not, check if greater than 0
          Math.abs(degrees - 360) : degrees; // if so, flop the direction of angle (from 20° to 340°), else degress == 0

        // Recalculate velocity based upon current speed (hypotenuse) and new degrees
        velocityX = (Math.cos(degrees * (Math.PI / 180)) * hypotenuse);
        velocityY = (-Math.sin(degrees * (Math.PI / 180)) * hypotenuse);
      }
      // Store these values

      entity.velocity[0] = velocityX;
      entity.velocity[1] = velocityY;

    }
    function drift(entity) {

      var degrees = entity.degrees, speed,
          inertialess = entity.inertialess;

      if (!inertialess) {
        entity.position[0] += entity.velocity[0] * rate;
        entity.position[1] += entity.velocity[1] * rate;
      }

      else if (inertialess) {
        speed = Math.sqrt(Math.pow(entity.velocity[0], 2) + Math.pow(entity.velocity[1], 2));

        entity.position[0] += (Math.cos(degrees * (Math.PI / 180)) * speed) * rate; 
        entity.position[1] += (-Math.sin(degrees * (Math.PI / 180)) * speed) * rate;
      }
    }
    function move_stars(entity) {

      var field_data = starData.field_data;
      var region_data = starData.region_data;

      var velocityX = entity.velocity[0],
          velocityY = entity.velocity[1];

      var positionX = entity.position[0],
          positionY = entity.position[1];

      for (var i = field_data.length; i--;) {

        x = field_data[i].offset[0] - (velocityX) * field_data[i].distance;
        y = field_data[i].offset[1] + (velocityY) * field_data[i].distance;

        x = -positionX * field_data[i].distance;
        y = -positionY * field_data[i].distance;

        var newTally = [
          Math.floor((x + region_data.width/2) / region_data.width),
          Math.floor((y + region_data.height/2) / region_data.height)
        ];

        var oldTally = [
          field_data[i].position[0] || 0,
          field_data[i].position[1] || 0
        ];

        // If x
        if (newTally[0] != oldTally[0]) {
          // If 'x' changed

          // These should go from 0 to 16
          if (newTally[0] != Math.abs(newTally[0])) {
            var left = (newTally[0]) ? (0 - newTally[0]) % (region_data.count) : 0;
          }
          else {
            var left = (newTally[0]) ? (region_data.count - 1) - (newTally[0] - 1) % region_data.count : 0;
          }

          var right = ((left - 1) < 0) ? region_data.count - 1 : left - 1;


          // If moving Right
          if ((newTally[0] - oldTally[0]) < 0) {
            var col = right;

            field_data[i].colCoords[right] = -(newTally[0] * region_data.width) + (region_data.width * (region_data.count - 1));
          }

          // If moving Left
          else {
            var col = left;
            field_data[i].colCoords[left] = -(newTally[0] * region_data.width);
          }

          field_data[i].moveCol = col;
        }

        // If y
        if (newTally[1] != oldTally[1]) {
          // If 'x' changed

          // These should go from 0 to 16
          // This math is complicated... basically it turns non-zero negative number into a positive integer that indicates which row is in on the top 
          if (newTally[1] != Math.abs(newTally[1])) { // If newTally is negative
            // top = the remainer of -newTally / number of rows
            var top = (newTally[1]) ? (-newTally[1] % region_data.count) : 0;
          }
          else { // If newTally is positive
            // top = the remainder of (number of rows - 1) - (number of grids off - 1) / number of rows
            var top = (newTally[1]) ? (region_data.count - 1) - (newTally[1] - 1) % region_data.count : 0;
          }

          var bottom = ((top - 1) < 0) ? region_data.count - 1 : top - 1;

          // If moving Right
          if ((newTally[1] - oldTally[1]) < 0) {
            var row = bottom;
            field_data[i].rowCoords[bottom] = -(newTally[1] * region_data.height) + (region_data.height * (region_data.count - 1));
          }

          // If moving Left
          else {
            var row = top;
            field_data[i].rowCoords[top] = -(newTally[1] * region_data.height);
          }


          field_data[i].moveRow = row;
        }

        field_data[i].position[0] = newTally[0];
        field_data[i].position[1] = newTally[1];

        field_data[i].offset[0] = x;
        field_data[i].offset[1] = y;
      }

    }

    function behavior_cc(entity) {

      var target = entities[0]; // Selects player

      var tDeg = ((tDeg = Math.atan2(target.velocity[1], target.velocity[0]) * (180 / Math.PI)) < 0) ? Math.abs(tDeg) : (tDeg > 0) ? Math.abs(tDeg - 360) : tDeg,
          tSpd = target.mSpeed,
          tPos = [
            target.position[0],
            target.position[1]
          ],
          tVel = [
            (Math.cos(tDeg * (Math.PI / 180)) * tSpd),
            (-Math.sin(tDeg * (Math.PI / 180)) * tSpd)
          ];

      var c = (Math.pow(tPos[0], 2) + Math.pow(tPos[1], 2)), // b
          b = (2 * tPos[0] * tVel[0] + 2 * tPos[1] * tVel[1]), // t*b
          a = (Math.pow(tVel[0], 2) + Math.pow(tVel[1], 2) - Math.pow(entity.speedLimit, 2)); // t^2*a

      var x1 = (-b + Math.sqrt(Math.pow(b,2) - (4 * a * c))) / (2 * a);
      var x2 = (-b - Math.sqrt(Math.pow(b,2) - (4 * a * c))) / (2 * a);

      if (x1 && x2) {
        var t = (x1 < x2) ? x1 : x2;
      } 
      else {
        var t = x1 || x2 || null;
      }

      var hypotenuse = t * target.mSpeed;

      // distance section
      // determine desired distance
      // send to distance function


      //thrust(entity);
      //drift(entity);
    }

    // Weapon functions
    // Needs a cleanup. Do entities need to be generated by the render side? I think so.
    function fire_weapons(entity) {
      // Fires a weapon (creates a new element, adds item to array)

      var weapons = entity.weapons;
      var entityInfo, elementInfo, insert;
      var newEntity;

      for (var i = weapons.length; i--;) {

        entityInfo = weaponData[weapons[i].weapon][0];
        elementInfo = weaponData[weapons[i].weapon][1];

        if (weapons[i].lastFired) {
          // If the weapon has a reload time

          var timeSinceFire, longerThanReload, longerThanBurst, midBurst;

          // Check to see if we're still bursting ([i][3] is burst count) and use different delay if we are
          timeSinceFire = (new Date().getTime()) - weapons[i].lastFired;

          longerThanReload = (timeSinceFire > ((/\./.test(entityInfo.reloadDelay)) ? (entityInfo.reloadDelay * 1000) : entityInfo.reloadDelay));
          longerThanBurst = (timeSinceFire > ((/\./.test(entityInfo.shotDelay)) ? (entityInfo.shotDelay * 1000) : entityInfo.shotDelay));
          midBurst = (weapons[i].burstCount < entityInfo.shotsPerBurst);

          // Calculate reload time and time since last fired

          // Make sure it's not been that long
          if (longerThanBurst) {
            if (midBurst) weapons[i].lastFired = null;

            // If it's been a long time and you were last in the middle of a burst clear bursts
            if (longerThanReload) {
              weapons[i].burstCount = 0;
            }
          }
        }

        // check if weapon's last time fired is past current time
        if (!weapons[i].lastFired) {

          newEntity = Object.create(entityInfo);

          newEntity.target = null;
          newEntity.parent = player;

          newEntity.degrees = entity.degrees + Math.floor(Math.random() * ((newEntity.innaccuracy * 2) + 1)) - newEntity.innaccuracy;

          // Need to add velocity of spaceship plus initial velocity of bolt
          newEntity.velocity = [
            (entity.velocity[0] + (Math.cos(newEntity.degrees * (Math.PI / 180)) * newEntity.initialSpeed)), 
            (entity.velocity[1] + (-Math.sin(newEntity.degrees * (Math.PI / 180)) * newEntity.initialSpeed))
          ];
          newEntity.position = [entity.position[0], entity.position[1]];
          newEntity.lifespan = 0;

          // Now, build the elment to match
          var insert = document.createElementNS("http://www.w3.org/2000/svg", elementInfo.element);

          for (var n = elementInfo.attributes.length; n--;)
            insert.setAttribute(elementInfo.attributes[n][0], elementInfo.attributes[n][1]);

          insert.innerHTML = elementInfo.content || "";
          insert.id = "weapon" + systemData.entity_count++;

          newEntity.element = insert;

          entityData.push(newEntity);
          document.getElementById("space").appendChild(insert);

          weapons[i].burstCount++; // Add 1 to the number of shots that have been fired
          if (weapons[i].burstCount > newEntity.shotsPerBurst) weapons[i].burstCount = 1; // Set burst count on firing 
          weapons[i].lastFired = (new Date().getTime()); // Set reload time
        }
      }
    }
    function projectile_distance(entity) {
      // Checks to see if a projectile is supposed to explode

      var speed = Math.sqrt(Math.pow(entity.velocity[0], 2) + Math.pow(entity.velocity[1], 2)),
          inertialess = entity.inertialess;

      entity.lifespan += rate; // Adds distance

      var lifetime = entity.range / entity.initialSpeed;

      if (entity.lifespan > lifetime) {
        kill_entity(entity);
      }
    }
    function kill_entity(entity) {

      // Maybe what this does is set entity type to dying
      // that -could- trigger a death function which triggers whatever animation necessary
      // or... something
      var element = entity.element;
      element.parentElement.removeChild(element);
      entityData.splice(entityData.indexOf(entity), 1);
    }

    function start() {
      update_finish = (new Date());
      setTimeout(update, 0);
    }

    return {
      start: start,
      grid: grid,
    }
  }());
  var render = (function() {

    var entities = entityData;

    function update() {
      for (var i = entities.length; i--;) { // Checks if i exists, then subtracts
        var entity = entities[i];

        move_entity(entity);

        if (entity.type == "player") {
          move_space(entity);
          move_stars();
        }
      }

      // Call this function again (when the browser feels like it)
      requestAnimationFrame(update);
    }

    function move_entity(entity) {
      var element = entity.element,
          transform = "translate(" + entity.position[0] + ", " + entity.position[1] + ") rotate(" + (-entity.degrees) + ") scale(1,1)";

      element.setAttribute("transform", transform);
    }
    function move_space(entity) {
      var element = document.getElementById("space"),
          transform = "translate(" + (-entity.position[0] + variables.center[0]) + ", " + (-entity.position[1] + variables.center[1]) + ")";

      element.setAttribute("transform", transform);
    }
    function move_stars() {

      var field_data = starData.field_data;
      var region_data = starData.region_data;

      for (var i = field_data.length; i--;) {

        var element = document.getElementById(field_data[i].distance);

        element.setAttribute("transform", "translate(" + field_data[i].offset[0] + "," + field_data[i].offset[1] + ")");

        var col = field_data[i].moveCol,
            row = field_data[i].moveRow;

        if (col === 0 || col > 0) {
          var cols = element.querySelectorAll("[data-sr-col='" + col + "']");

          for (var c = cols.length; c--;) {

            cols[c].setAttribute("transform", "translate(" + field_data[i].colCoords[col] + "," + field_data[i].rowCoords[c] + ")");  
          }

          field_data[i].moveCol = null;
        }

        if (row === 0 || row > 0) {
          var rows = element.querySelectorAll("[data-sr-row='" + row + "']");
          for (var r = rows.length; r--;) {
            rows[r].setAttribute("transform", "translate(" + field_data[i].colCoords[r] + "," + field_data[i].rowCoords[row] + ")");  
          }

          field_data[i].moveRow = null;
        }
      }
    }

    return {
      start: update,
    }
  }());

  function controls(event) {
    // Tracks which keys are pressed then triggers functions based on key state
    // This is mostly for things like turning on the engines when you first hit thrust and not for actual calculation of thrust.

    var keys = variables.keys_pressed;

    // Check if this key has been encountered before, and if not, store it.
    if (!keys[event.keyCode]) {
      keys[event.keyCode] = 0;
    }

    if (event.type == "keydown") {// If the event is keydown, add 1 to the number of presses
      keys[event.keyCode]++;
    }

    else if (event.type == "keyup") { // If the event is "keyup", set key presses to 0.
      keys[event.keyCode] = 0;
    }

  }

  return {
    starData: starData,
    entities: entityData,
    weapons: weaponData,
  }
}());